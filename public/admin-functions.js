async function sendBroadcast() {
    const message = document.getElementById('broadcastMessage').value.trim();

    if (!message) {
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: 'Введите текст сообщения',
                buttons: [{ type: 'ok', text: 'OK' }]
            });
        }
        return;
    }

    try {
        const response = await fetch('/api/admin/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (response.ok) {
            const result = await response.json();
            document.getElementById('broadcastMessage').value = '';

            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({
                    title: 'Рассылка завершена',
                    message: `Отправлено: ${result.successCount}, Ошибок: ${result.failureCount}`,
                    buttons: [{ type: 'ok', text: 'OK' }]
                });
            }
        } else {
            console.error('Ошибка при отправке рассылки');
        }
    } catch (error) {
        console.error('Error sending broadcast:', error);
    }
}

async function banUser() {
    const userId = document.getElementById('banUserId').value.trim();
    const reason = document.getElementById('banReason').value.trim();

    if (!userId) {
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: 'Введите ID пользователя',
                buttons: [{ type: 'ok', text: 'OK' }]
            });
        }
        return;
    }

    try {
        const response = await fetch('/api/admin/ban-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: parseInt(userId), reason })
        });

        if (response.ok) {
            document.getElementById('banUserId').value = '';
            document.getElementById('banReason').value = '';

            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({
                    title: 'Пользователь заблокирован',
                    message: `Пользователь ${userId} был заблокирован`,
                    buttons: [{ type: 'ok', text: 'OK' }]
                });
            }
        } else {
            console.error('Ошибка при блокировке пользователя');
        }
    } catch (error) {
        console.error('Error banning user:', error);
    }
}

async function updateUsername() {
    const oldUsername = document.getElementById('oldUsername').value.trim();
    const newUsername = document.getElementById('newUsername').value.trim();

    if (!oldUsername || !newUsername) {
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: 'Ошибка',
                message: 'Заполните оба поля',
                buttons: [{ type: 'ok', text: 'OK' }]
            });
        }
        return;
    }

    try {
        const response = await fetch('/api/admin/update-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldUsername, newUsername })
        });

        if (response.ok) {
            document.getElementById('oldUsername').value = '';
            document.getElementById('newUsername').value = '';

            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({
                    title: 'Username обновлен',
                    message: `Username изменен с ${oldUsername} на ${newUsername}`,
                    buttons: [{ type: 'ok', text: 'OK' }]
                });
            }
        } else {
            console.error('Ошибка при обновлении username');
        }
    } catch (error) {
        console.error('Error updating username:', error);
    }
}

async function updateLinks() {
    const channelLink = document.getElementById('channelLink').value.trim();
    const chatLink = document.getElementById('chatLink').value.trim();
    const groupLink = document.getElementById('groupLink').value.trim();

    try {
        const response = await fetch('/api/admin/update-links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channelLink, chatLink, groupLink })
        });

        if (response.ok) {
            if (window.Telegram?.WebApp?.showPopup) {
                window.Telegram.WebApp.showPopup({
                    title: 'Настройки сохранены',
                    message: 'Ссылки успешно обновлены',
                    buttons: [{ type: 'ok', text: 'OK' }]
                });
            }
        } else {
            console.error('Ошибка при сохранении настроек');
        }
    } catch (error) {
        console.error('Error updating links:', error);
    }
}

async function loadAppSettings() {
    try {
        const response = await fetch('/api/app-settings');
        if (response.ok) {
            const settings = await response.json();

            if (settings.channel_link) {
                document.getElementById('channelLink').value = settings.channel_link;
            }
            if (settings.chat_link) {
                document.getElementById('chatLink').value = settings.chat_link;
            }
            if (settings.group_link) {
                document.getElementById('groupLink').value = settings.group_link;
            }
        }
    } catch (error) {
        console.error('Error loading app settings:', error);
    }
}