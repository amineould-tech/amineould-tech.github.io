// ==========================================
// GLOBAL CONFIGURATION (Non-DOM elements)
// ==========================================
const THEME_KEY = 'heartline-theme';
let THEME_LIST = [
    // ... (Your theme list)
    'light',    
    'dark',    
    'guilty-crown',    
    'naruto',    
    'dragon-ball',    
    'anime-girls',
    // NEW ANIME THEMES ADDED HERE
    'attack-on-titan',    
    'demon-slayer',    
    'one-piece',    
    'sailor-moon',    
    'cyberpunk'
];

// ==========================================
// MAIN APP LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM ELEMENTS SELECTION ---
    // (Everything selected here ensures the HTML is ready)
    
    // Core Layout
    const body = document.body;
    
    // Journal Elements
    const journal = document.getElementById('journal');
    const saveEntryBtn = document.getElementById('save-entry');
    const historyDiv = document.getElementById('history');

    // Goal Elements
    const goalInput = document.getElementById('goal-input');
    const addGoalBtn = document.getElementById('add-goal');
    const goalsList = document.getElementById('goals-list');

    // Reminder Elements
    const reminderInput = document.getElementById('reminder-input');
    const reminderDate = document.getElementById('reminder-date');
    const reminderTime = document.getElementById('reminder-time');
    const addReminderBtn = document.getElementById('add-reminder');
    const remindersList = document.getElementById('reminders-list');
    const reminderTitle = document.getElementById('reminder-title');

    // Security Elements
    const unlockInput = document.getElementById('unlock-input');
    const unlockBtn = document.getElementById('unlock-btn');
    const lockStatus = document.getElementById('lock-status');

    // Theme & Modal Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeModal = document.getElementById('theme-modal');
    const closeBtn = themeModal ? themeModal.querySelector('.close-btn') : null;
    const themeListContainer = document.getElementById('theme-list-container');
    const executeThemeScriptBtn = document.getElementById('execute-theme-script');
    const themeScriptInput = document.getElementById('theme-script-input');

    // Export/Import Elements
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-input');

    // 🔑 NEW: Chapter Edit Modal Elements
    const chapterEditModal = document.getElementById('chapter-edit-modal');
    const chapterCloseBtn = chapterEditModal ? chapterEditModal.querySelector('.chapter-close') : null;
    const chapterEditTitle = document.getElementById('chapter-edit-title');
    const chapterEditTextArea = document.getElementById('chapter-edit-textarea');
    let chapterUpdateBtn = document.getElementById('chapter-update-btn'); // Will be cloned and replaced
    let chapterDeleteBtn = document.getElementById('chapter-delete-btn'); // Will be cloned and replaced

    // --- STATE VARIABLES ---
    let isUnlocked = false; // Only declared ONCE here
    let selectedGoalPriority = '';
    let selectedReminderPriority = '';
    let activeGoalButton = null;
    let activeReminderButton = null;

    // --- INITIALIZATION ---
    // Load current theme immediately
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
    // Initial lock check (important if app should start locked)
    if (!isUnlocked) {
        body.classList.remove('unlocked');
    }
    loadAllData();

    // ==========================================
    // CHAPTER EDITING FUNCTIONS
    // ==========================================

    function closeChapterEditModal() {
        if (chapterEditModal) {
            chapterEditModal.style.display = 'none';
        }
    }

    function openEditModal(index, entries) {
        if (!isUnlocked) return;
        
        const entryToEdit = entries[index];
        if (!entryToEdit) return;

        // 1. Populate Modal
        chapterEditTitle.textContent = `Edit Chapter for ${entryToEdit.date}`;
        chapterEditTextArea.value = entryToEdit.text;

        // 2. Clear old listeners by cloning the update/delete buttons
        // This is crucial to prevent multiple save/delete actions on one click
        const oldUpdateBtn = chapterUpdateBtn;
        chapterUpdateBtn = oldUpdateBtn.cloneNode(true); // true means copy children (text, etc.)
        oldUpdateBtn.parentNode.replaceChild(chapterUpdateBtn, oldUpdateBtn);

        const oldDeleteBtn = chapterDeleteBtn;
        chapterDeleteBtn = oldDeleteBtn.cloneNode(true); 
        oldDeleteBtn.parentNode.replaceChild(chapterDeleteBtn, oldDeleteBtn);
        
        // 3. Bind NEW listeners
        chapterUpdateBtn.addEventListener('click', () => {
            saveEditedChapter(index, entries);
        });

        chapterDeleteBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete the chapter from ${entryToEdit.date}?`)) {
                deleteChapter(index, entries);
            }
        });

        // 4. Show Modal
        chapterEditModal.style.display = 'block';
    }

    function saveEditedChapter(index, entries) {
        const newText = chapterEditTextArea.value.trim();
        if (!newText) {
            alert('Chapter cannot be empty.');
            return;
        }

        entries[index].text = newText;
        localStorage.setItem('entries', JSON.stringify(entries));
        closeChapterEditModal();
        loadEntries(); // Re-render the history list
    }

    function deleteChapter(index, entries) {
        // Remove 1 element at the specified index
        entries.splice(index, 1);
        localStorage.setItem('entries', JSON.stringify(entries));
        closeChapterEditModal();
        loadEntries(); // Re-render the history list
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    // 1. Theme Modal Handling (Opening/Closing)
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            renderThemeModal(THEME_LIST, themeListContainer, localStorage.getItem(THEME_KEY), applyTheme);
            themeModal.style.display = 'block';
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            themeModal.style.display = 'none';
        });
    }

    // 🔑 NEW: Chapter Edit Modal Close
    if(chapterCloseBtn) {
        chapterCloseBtn.addEventListener('click', closeChapterEditModal);
    }

    window.addEventListener('click', (e) => {
        if (e.target === themeModal) {
            themeModal.style.display = 'none';
        }
        // 🔑 NEW: Click outside Chapter Edit Modal closes it
        if (e.target === chapterEditModal) {
            closeChapterEditModal();
        }
    });
    // ... (Your existing listeners for Reminder Toggle, Priority, Journal Save, Goals, Reminders, Export/Import, Theme Script)
    
    // 5. Lock System (Modified to call loadAllData only on unlock)
    unlockBtn.addEventListener('click', () => {
        if (unlockInput.value === 'guilty') {
            isUnlocked = true;
            lockStatus.textContent = '🔓 Unlocked';
            unlockInput.value = '';

            body.classList.add('unlocked'); 

            loadAllData(); // Load data including newly active edit buttons
        } else {
            alert('The void does not open for strangers.');
            unlockInput.value = '';
        }
    });

    // 6. Journal Logic
    saveEntryBtn.addEventListener('click', () => {
        if (!journal.value.trim()) return;
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const entry = { date, text: journal.value };
        let entries = JSON.parse(localStorage.getItem('entries') || '[]');
        entries.push(entry);
        localStorage.setItem('entries', JSON.stringify(entries));
        journal.value = '';
        loadEntries();
    });

    // 7. Goals Logic
    addGoalBtn.addEventListener('click', () => {
        const goal = goalInput.value.trim();
        if (!goal) return;
        const priority = selectedGoalPriority || 'light';
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        goals.push({ text: goal, priority, done: false });
        localStorage.setItem('goals', JSON.stringify(goals));
        goalInput.value = '';
        if (activeGoalButton) {
            activeGoalButton.classList.remove('active');
            activeGoalButton = null;
        }
        selectedGoalPriority = '';
        loadGoals();
    });

    // 8. Reminders Logic
    addReminderBtn.addEventListener('click', () => {
        const text = reminderInput.value.trim();
        const date = reminderDate.value;
        const time = reminderTime.value;
        if (!text || !date) return;
        const priority = selectedReminderPriority || 'light';
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        reminders.push({ text, date, time, priority, done: false });
        localStorage.setItem('reminders', JSON.stringify(reminders));
        reminderInput.value = '';
        reminderDate.value = '';
        reminderTime.value = '';
        if (activeReminderButton) {
            activeReminderButton.classList.remove('active');
            activeReminderButton = null;
        }
        selectedReminderPriority = '';
        loadReminders();
    });

    // ... (Your existing listeners for Export, Import, Theme Script)

    // 11. Theme Script Logic (CAUTION: Eval is dangerous)
    executeThemeScriptBtn.addEventListener('click', () => {
        const script = themeScriptInput.value.trim();
        if (!script) {
            alert('Please enter a script to execute.');
            return;
        }
        try {
            eval(script);    
            const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
            applyTheme(currentTheme);
            renderThemeModal(THEME_LIST, themeListContainer, currentTheme, applyTheme);    
            alert('Theme Script executed successfully!');
            themeScriptInput.value = '';    
        } catch (error) {
            alert('Error executing script: ' + error.message);
        }
    });

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    function loadAllData() {
        loadEntries();
        loadGoals();
        loadReminders();
    }

    // 🔑 MODIFIED: loadEntries to handle the 'Edit' button
    function loadEntries() {
        const entries = JSON.parse(localStorage.getItem('entries') || '[]');
        historyDiv.innerHTML = '';
        
        if (entries.length === 0) {
            historyDiv.innerHTML = '<p>No chapters yet. Begin today.</p>';
            return;
        }

        // Reverse to show newest entry first
        [...entries].reverse().forEach((e, reverseIndex) => {
            // Calculate the actual index in the original array
            const actualIndex = entries.length - 1 - reverseIndex; 

            const div = document.createElement('div');
            div.className = 'journal-entry';
            
            let innerHTML = `<strong>${e.date}</strong><br><span class="preview">${e.text.substring(0, 50)}...</span>`;
            
            // Only add the button if unlocked
            if (isUnlocked) {
                innerHTML += `<button class="edit-btn small" data-index="${actualIndex}">Edit</button>`;
            }

            div.innerHTML = innerHTML;
            historyDiv.appendChild(div);

            // Bind click event for viewing (and editing if unlocked)
            if (isUnlocked) {
                 // Attach listener to the Edit button
                div.querySelector('.edit-btn').addEventListener('click', (event) => {
                    // Stop click from propagating to the parent div's default handler (if you had one)
                    event.stopPropagation(); 
                    openEditModal(actualIndex, entries);
                });

            } else {
                // If locked, bind the click to view the full entry (optional)
                div.addEventListener('click', () => {
                    alert(`${e.date}:\n\n${e.text}`);
                });
            }
        });
    }

    function loadGoals() {
        // ... (Your existing loadGoals function)
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        goalsList.innerHTML = '';
        goals.forEach((goal, index) => {
            const li = document.createElement('li');
            li.className = goal.done ? 'done' : '';
            li.setAttribute('data-priority', goal.priority);
            li.innerHTML = `
                <div><span class="priority">${getPriorityEmoji(goal.priority)}</span> ${goal.text}</div>
                <div>
                    <button class="done-btn small" onclick="toggleDone('goals', ${index})">${goal.done ? 'Undo' : 'Done'}</button>
                    ${isUnlocked ? `<button class="delete-btn small" onclick="deleteItem('goals', ${index})">❌</button>` : ''}
                </div>
            `;
            goalsList.appendChild(li);
        });
    }

    function loadReminders() {
        // ... (Your existing loadReminders function)
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        remindersList.innerHTML = '';
        reminders.forEach((reminder, index) => {
            const li = document.createElement('li');
            li.className = reminder.done ? 'done' : '';
            li.setAttribute('data-priority', reminder.priority);
            li.innerHTML = `
                <div>
                    <span class="priority">${getPriorityEmoji(reminder.priority)}</span> 
                    **${reminder.date}${reminder.time ? ` @ ${reminder.time}` : ''}**: ${reminder.text}
                </div>
                <div>
                    <button class="done-btn small" onclick="toggleDone('reminders', ${index})">${reminder.done ? 'Undo' : 'Done'}</button>
                    ${isUnlocked ? `<button class="delete-btn small" onclick="deleteItem('reminders', ${index})">❌</button>` : ''}
                </div>
            `;
            remindersList.appendChild(li);
        });
    }

    // ... (Your existing helper functions: applyTheme, renderThemeModal, getPriorityEmoji, toggleDone, deleteItem)
    
    // --- Initial load (only goals and reminders can be loaded before unlock)
    loadGoals();
    loadReminders();
    loadEntries(); // Load the entry display, which will be passive until unlocked.

}); 

// ==========================================
// GLOBALLY EXPOSED FUNCTIONS (Must be outside DOMContentLoaded)
// ==========================================

function getPriorityEmoji(priority) {
    // ... (Your existing getPriorityEmoji function)
    switch (priority) {
        case 'light': return '💙';
        case 'medium': return '💛';
        case 'deep': return '❤️';
        default: return '⚪';
    }
}

function applyTheme(themeName) {
    // ... (Your existing applyTheme function)
    const body = document.body;
    body.className = '';
    body.classList.add(`${themeName}-theme`);
    localStorage.setItem(THEME_KEY, themeName);
}

function renderThemeModal(THEME_LIST, themeListContainer, currentTheme, applyThemeCallback) {
    // ... (Your existing renderThemeModal function)
    themeListContainer.innerHTML = '';
    THEME_LIST.forEach(theme => {
        const btn = document.createElement('button');
        btn.textContent = theme.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        btn.className = `theme-select-btn ${theme === currentTheme ? 'active-theme' : ''}`;
        btn.addEventListener('click', () => {
            applyThemeCallback(theme);
            document.querySelectorAll('.theme-select-btn').forEach(b => b.classList.remove('active-theme'));
            btn.classList.add('active-theme');
        });
        themeListContainer.appendChild(btn);
    });
}

function toggleDone(storageKey, index) {
    // ... (Your existing toggleDone function)
    let items = JSON.parse(localStorage.getItem(storageKey) || '[]');
    items[index].done = !items[index].done;
    localStorage.setItem(storageKey, JSON.stringify(items));
    document.dispatchEvent(new Event('DOMContentLoaded')); // Re-load data by simulating DOM load
}

function deleteItem(storageKey, index) {
    // ... (Your existing deleteItem function)
    let items = JSON.parse(localStorage.getItem(storageKey) || '[]');
    items.splice(index, 1);
    localStorage.setItem(storageKey, JSON.stringify(items));
    document.dispatchEvent(new Event('DOMContentLoaded')); // Re-load data by simulating DOM load
}