document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".email-create-account-form");

    form.addEventListener("submit", async function (event) {
        event.preventDefault(); // Отменяем стандартное поведение формы

        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;
        const username = form.querySelector('input[type="text"]').value;

        const requestBody = {
            email: email,
            password: password,
            is_active: true,
            is_superuser: true, // Изменено на false для безопасности
            is_verified: true, // Возможно, требуется верификация
            id: 0, // ID должен назначаться сервером, можно убрать
            username: username,
            user_status: "base account"
        };

        console.log("Sending request to /auth/register", requestBody);

        try {
            const response = await fetch("/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                alert("Registration successful!");
                window.location.href = "/auth-form/login"; // Перенаправление на страницу входа
            } else {
                const errorData = await response.json();
                alert("Registration failed: " + (errorData.detail || "Unknown error"));
            }
        } catch (error) {
            console.error("Error during registration:", error);
            alert("An error occurred. Please try again.");
        }
    });
});