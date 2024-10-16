import requests
import warnings
from logs.logs_config import logging
from celery import Celery, chain, group
from celery.result import GroupResult
from transformers import pipeline
from sqlalchemy.exc import SQLAlchemyError
from app.src.models.models import EventORM
from app.src.settings.config import session_maker, API_GUARDIAN_KEY
from datetime import datetime
from celery.schedules import crontab

CELERY_BROKER_URL = "redis://localhost:6379"
CELERY_RESULT_BACKEND = "redis://localhost:6379"

celery_app = Celery("my_celery_app", broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)
celery_app.conf.broker_connection_retry_on_startup = True

# Ignoring some information from transformers
warnings.filterwarnings("ignore", category=FutureWarning, module="transformers.tokenization_utils_base")

# Initializing a classifier
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

# Celery config
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    result_expires=1000
)

# Для зимового часу (UTC+2):
#   14:30 по Україні буде 12:30 UTC.
# Для літнього часу (UTC+3):
#   14:30 по Україні буде 11:30 UTC.

# Config of Celery deferred operation
celery_app.conf.beat_schedule = {
    'run-main-task-every-day-6am': {
        'task': 'app.src.services.tasks.main_task',
        # 'schedule': crontab(hour='20', minute='55'),  # start at 23:55
        'schedule': crontab(hour='16', minute='48'),
        # 'schedule': crontab(minute='*/5'),
    },
}


@celery_app.task
def parse_the_guardian_api_and_validate_data() -> list:
    """
        Function that parse The Guardian API
        :return: list of dict elements
    """

    current_time_utc = datetime.utcnow()
    str_current_time = current_time_utc.strftime("%Y-%m-%d")

    url = 'https://content.guardianapis.com/search'
    start_page = 1
    page_size = 50

    all_results_event_data = []

    while True:
        params = {
            'q': 'cryptocurrency',
            'from-date': '2024-05-01',
            'to-date': str_current_time,
            'api-key': API_GUARDIAN_KEY,
            'page-size': page_size,
            'page': start_page
        }

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()  # raise an error differ to 2**
            data = response.json()
            results = data['response']['results']
            all_results_event_data.extend(results)

            if start_page >= data['response']['pages']:
                break

            start_page += 1

        except requests.exceptions.HTTPError as http_err:
            logging.error(f"HTTP error occurred: {http_err}")
            break
        except Exception as err:
            logging.error(f"Other error occurred: {err}")
            break

    return all_results_event_data


@celery_app.task
def is_event_important(event: list) -> bool:
    """
        Function that checks is event important
    :param (list) event: result that returns from parse_the_guardian_api_and_validate_data
    :return (bool): answer is event important by some labels
    """

    labels = [
        "financial impact",
        "political impact",
        "market impact",
        "economic impact",
        "social impact",
        "not important"
    ]

    try:
        result = classifier(event['webTitle'], candidate_labels=labels)

        # Check if the event is important (for example, related to financial, political or economic impact)
        important_labels = {"financial impact", "political impact", "market impact", "economic impact"}
        return result['labels'][0] in important_labels

    except Exception as e:
        logging.error(f"Error processing event {event['webTitle']}: {e}")
        return False


@celery_app.task
def divide_events_data_between_workers(events: list, count_workers: int = 6) -> list:
    """
        Function that divides data volume between workers to define is events important
    :param (list) events: result that returns from parse_the_guardian_api_and_validate_data
    :param (int) count_workers: count of workers to deal with a data volume (by default 6)
    :return (list): first param is a list of events, second param is a group task id
    """
    chunk_size = len(events) // count_workers
    remainder = len(events) % count_workers

    chunks = []
    start = 0
    for i in range(count_workers):
        end = start + chunk_size + (1 if i < remainder else 0)
        chunks.append(events[start:end])
        start = end

    # creating task group
    tasks_group = group(is_event_important.s(event) for chunk in chunks for event in chunk)

    # starting tasks
    result = tasks_group.apply_async()
    # saving results of a group task to be restored in the future
    result.save()

    return [events, result.id]


@celery_app.task
def add_to_db(divide_result: list) -> list:
    """
        Function that restores group result by id and adds data to the DB
    :param (list) divide_result: result of divide_events_data_between_workers
    :return (list): events with their bool answers on importance
    """
    events = divide_result[0]
    result_id = divide_result[1]

    bool_results = []
    events_with_bool_important = []

    try:

        # restoring group results by a group id
        group_result = GroupResult.restore(result_id)

        if group_result is None:
            logging.error(f"No group result found for ID: {result_id}")

        for result in group_result.results:
            if result.ready():
                bool_results.append(result.result)
            else:
                bool_results.append(None)

        for bool_res_event, dict_event in zip(bool_results, events):
            if bool_res_event is not None and bool_res_event is not False:
                events_with_bool_important.append([bool_res_event, dict_event])
            else:
                events_with_bool_important.append([False, dict_event])

    except Exception as ex:
        logging.error(f"Something went wrong with restoring group: {ex}")

    with session_maker() as session:
        for event in events_with_bool_important:
            try:
                # date_obj = datetime.strptime(event[1]["webPublicationDate"], '%Y-%m-%dT%H:%M:%SZ')

                new_event = EventORM(
                    roe=event[1].get("roe"),
                    title=event[1]["webTitle"],
                    category=event[1]["sectionName"],
                    date=event[1]["webPublicationDate"],
                    url=event[1]["webUrl"]
                )

                if not new_event.title or not new_event.url:
                    logging.warning(f"Event skipped due to inclusion of required fields: {event}")
                    continue

                session.add(new_event)

                session.commit()
            except SQLAlchemyError as db_ex:
                logging.error(f"Error of saving data to DB: {db_ex}")
                session.rollback()
            except Exception as ex:
                logging.error(f"Error of processing {event}: {ex}")

    return events_with_bool_important


@celery_app.task
def main_task():
    """
        Function that compile celery tasks in a chain link and starts it
    :return: chain result
    """
    result = chain(
        parse_the_guardian_api_and_validate_data.s(),
        divide_events_data_between_workers.s(count_workers=6),
        add_to_db.s()
    )()

    return result

# to start workers: celery -A app.src.services.tasks.celery_app worker --loglevel=info --pool=threads
# to start beat:    celery -A app.src.services.tasks.celery_app beat --loglevel=info
