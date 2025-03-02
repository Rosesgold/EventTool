document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector(".email-login-form");

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;

        const formData = new URLSearchParams();
        formData.append("grant_type", "password");
        formData.append("username", email);
        formData.append("password", password);
        formData.append("scope", "");
        formData.append("client_id", "");
        formData.append("client_secret", "");

        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData
            });

            console.log("Response status:", response.status);

            const text = await response.text(); // Читаем как текст
            console.log("Raw response:", text);

            let data;
            try {
                data = JSON.parse(text); // Пробуем распарсить JSON
            } catch (error) {
                console.warn("Empty response or invalid JSON", error);
                data = {};
            }

            if (response.ok) {
                localStorage.setItem("access_token", data.access_token);
                localStorage.setItem("isLoggedIn", "true"); // Устанавливаем флаг аутентификации
                window.location.href = "/";
            } else {
                alert(`Login failed: ${data.detail || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred while logging in.");
        }
    });
});

