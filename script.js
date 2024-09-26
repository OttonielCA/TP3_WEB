document.addEventListener('DOMContentLoaded', () => {
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskForm = document.getElementById('task-form');
    const newTaskForm = document.getElementById('new-task-form');
    const taskList = document.getElementById('task-list');
    const menuBtn = document.getElementById('menu-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const completedTasksList = document.getElementById('completed-tasks-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const editModal = document.getElementById('edit-modal');
    const editTaskForm = document.getElementById('edit-task-form');
    let activeTasks = JSON.parse(localStorage.getItem('activeTasks')) || [];
    let currentDisplayDate = new Date();

    let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];

    addTaskBtn.addEventListener('click', () => {
        taskForm.classList.toggle('hidden');
    });

    menuBtn.addEventListener('click', () => {
        historyModal.style.display = 'block';
        displayCompletedTasks();
    });

    closeHistoryBtn.addEventListener('click', () => {
        historyModal.style.display = 'none';
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique des tâches terminées ?')) {
            completedTasks = [];
            localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
            displayCompletedTasks();
        }
    });

    function saveActiveTasks() {
        localStorage.setItem('activeTasks', JSON.stringify(activeTasks));
    }

    function loadActiveTasks() {
        taskList.innerHTML = '';
        activeTasks.forEach(task => createTaskTile(task));
    }

    function checkExpiredTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        activeTasks = activeTasks.filter(task => {
            const taskDate = new Date(task.date);
            if (taskDate < today) {
                addToCompletedTasks(task);
                return false;
            }
            return true;
        });
        saveActiveTasks();
        loadActiveTasks();
    }

    checkExpiredTasks();
    setInterval(checkExpiredTasks, 3600000);

    window.addEventListener('click', (event) => {
        if (event.target === historyModal) {
            historyModal.style.display = 'none';
        }
    });

    newTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskName = document.getElementById('task-name').value;
        const taskDate = document.getElementById('task-date').value;
        const taskMessage = document.getElementById('task-message').value;
    
        const taskData = { name: taskName, date: taskDate, message: taskMessage };
    
        try {
            const response = await fetch('http://gyoukou.ca/ressources/projet3.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
    
            if (response.ok) {
                activeTasks.push(taskData);
                saveActiveTasks();
                createTaskTile(taskData);
                updateSidebar();
                newTaskForm.reset();
                taskForm.classList.add('hidden');
            } else {
                throw new Error('Erreur lors de la création de la tâche');
            }
        } catch (error) {
            alert('Erreur : ' + error.message);
        }
    });

    function createTaskTile(task) {
        const tile = document.createElement('div');
        tile.className = 'task-tile';
        tile.innerHTML = `
            <h3>${task.name}</h3>
            <p>Échéance : ${task.date}</p>
            <p class="task-message">${task.message}</p>
            <button class="complete-task-btn">Terminer</button>
            <button class="edit-task-btn">Modifier</button>
        `;

        const completeBtn = tile.querySelector('.complete-task-btn');
        completeBtn.addEventListener('click', () => {
            confirmModal.style.display = 'block';
            confirmOkBtn.onclick = async () => {
                try {
                    const response = await fetch('http://gyoukou.ca/ressources/projet3.php', {
                        method: 'GET'
                    });
                    const data = await response.text();
                    alert(data);
                    removeActiveTask(task);
                    addToCompletedTasks(task);
                    tile.remove();
                    confirmModal.style.display = 'none';
                } catch (error) {
                    alert('Erreur : ' + error.message);
                }
            };
            confirmCancelBtn.onclick = () => {
                confirmModal.style.display = 'none';
            };
        });

        const editBtn = tile.querySelector('.edit-task-btn');
        editBtn.addEventListener('click', () => {
            document.getElementById('edit-task-name').value = task.name;
            document.getElementById('edit-task-date').value = task.date;
            document.getElementById('edit-task-message').value = task.message;
            editModal.style.display = 'block';

            editTaskForm.onsubmit = async (e) => {
                e.preventDefault();
                const newName = document.getElementById('edit-task-name').value;
                const newDate = document.getElementById('edit-task-date').value;
                const newMessage = document.getElementById('edit-task-message').value;

                const updatedTask = { name: newName, date: newDate, message: newMessage };
                await updateTask(tile, updatedTask, task);
                editModal.style.display = 'none';
            };
        });

        taskList.appendChild(tile);
    }

    async function updateTask(tile, updatedTask, originalTask) {
        try {
            const response = await fetch('http://gyoukou.ca/ressources/projet3.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedTask)
            });

            if (response.ok) {
                tile.querySelector('h3').textContent = updatedTask.name;
                tile.querySelector('p').textContent = `Échéance : ${updatedTask.date}`;
                tile.querySelector('.task-message').textContent = updatedTask.message;
                
                const index = activeTasks.findIndex(t => 
                    t.name === originalTask.name && 
                    t.date === originalTask.date && 
                    t.message === originalTask.message
                );
                if (index !== -1) {
                    activeTasks[index] = updatedTask;
                    saveActiveTasks();
                }
            } else {
                throw new Error('Erreur lors de la mise à jour de la tâche');
            }
        } catch (error) {
            alert('Erreur : ' + error.message);
        }
    }

    function removeActiveTask(task) {
        activeTasks = activeTasks.filter(t => 
            t.name !== task.name || 
            t.date !== task.date || 
            t.message !== task.message
        );
        saveActiveTasks();
        updateSidebar();
    }

    function addToCompletedTasks(task) {
        const completionDate = new Date().toISOString();
        completedTasks.push({ ...task, completionDate });
        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    }

    function displayCompletedTasks() {
        completedTasksList.innerHTML = '';
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        completedTasks = completedTasks.filter(task => {
            const completionDate = new Date(task.completionDate);
            return completionDate > thirtyDaysAgo;
        });

        completedTasks.forEach(task => {
            const tile = document.createElement('div');
            tile.className = 'task-tile';
            tile.innerHTML = `
                <h3>${task.name}</h3>
                <p>Échéance : ${task.date}</p>
                <p>Terminée le : ${new Date(task.completionDate).toLocaleDateString()}</p>
            `;
            completedTasksList.appendChild(tile);
        });

        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
    }

    function highlightToday(calendarGrid, today) {
        const allDays = calendarGrid.querySelectorAll('.calendar-day:not(.day-name):not(.other-month)');
        allDays.forEach((day, index) => {
            if (parseInt(day.textContent) === today.getDate()) {
                day.classList.add('today');
            } else {
                day.classList.remove('today');
            }
        });
    }

    function createCalendar(date = new Date()) {
        const calendar = document.getElementById('calendar');
        const today = new Date(); // Stocke la date actuelle
        const year = date.getFullYear();
        const month = date.getMonth();
    
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
    
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        calendar.innerHTML = `
            <div class="calendar-header">
                <button id="prev-month">&lt;</button>
                <h2>${monthNames[month]} ${year}</h2>
                <button id="next-month">&gt;</button>
            </div>
            <div class="calendar-grid">
                ${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => `<div class="calendar-day day-name">${day}</div>`).join('')}
            </div>
        `;
    
        const calendarGrid = calendar.querySelector('.calendar-grid');
        for (let i = 0; i < firstDay.getDay(); i++) {
            calendarGrid.innerHTML += '<div class="calendar-day other-month"></div>';
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            dayElement.textContent = i;
            calendarGrid.appendChild(dayElement);
        }
    
        // Mettez en surbrillance le jour actuel seulement si on est dans le mois et l'année actuels
        if (year === today.getFullYear() && month === today.getMonth()) {
            highlightToday(calendarGrid, today);
        }
    
        document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

        displayImportantDates();
    }
    
    
    function changeMonth(delta) {
        currentDisplayDate = new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() + delta, 1);
        const minDate = new Date(2024, 0); // January 2024
        const maxDate = new Date(new Date().getFullYear() + 10, 0); // January 10 years from now
    
        if (currentDisplayDate >= minDate && currentDisplayDate <= maxDate) {
            createCalendar(currentDisplayDate);
            updateSidebar(); // Assurez-vous que cette ligne est présente
        } else {
            currentDisplayDate = new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() - delta, 1);
        }
    }

    function updateSidebar() {
        const sidebar = document.querySelector('.sidebar');
        
        // Supprimer complètement l'ancienne section des dates importantes
        const existingImportantDates = document.getElementById('important-dates');
        if (existingImportantDates) {
            existingImportantDates.remove();
        }
        

    }    
    
    function displayImportantDates() {
        const sidebar = document.querySelector('.sidebar');
        const currentMonth = currentDisplayDate.getMonth();
        const currentYear = currentDisplayDate.getFullYear();
    
        const importantDatesSection = document.createElement('div');
        importantDatesSection.id = 'important-dates';
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = 'Dates importantes';
        importantDatesSection.appendChild(sectionTitle);
    
        const currentMonthTasks = activeTasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
        });
    
        currentMonthTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    
        if (currentMonthTasks.length === 0) {
            const noTasksMessage = document.createElement('p');
            noTasksMessage.textContent = 'Aucune tâche ce mois-ci';
            importantDatesSection.appendChild(noTasksMessage);
        } else {
            currentMonthTasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.classList.add('important-date');
                taskElement.textContent = `${new Date(task.date).getDate() + 1} - ${task.name}`;
                taskElement.addEventListener('click', () => highlightTask(task));
                importantDatesSection.appendChild(taskElement);
            });
        }
    
        // Ajouter la nouvelle section à la barre latérale
        sidebar.appendChild(importantDatesSection);
    }    

    createCalendar();
    loadActiveTasks();

});