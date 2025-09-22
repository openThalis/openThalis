export class FrequencyManager {
    constructor(taskSettings) {
        this.taskSettings = taskSettings;
        this.currentFrequency = 'once';
        this.isNow = true; // Default to "now" when frequency is "once"
    }

    selectFrequency(frequency, preserveIsNow = false) {
        this.currentFrequency = frequency;

        this.taskSettings.elements.frequencyBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.frequency === frequency);
        });

        // Only set default isNow state if we're not preserving the current state
        if (!preserveIsNow) {
            // ONLY set isNow=true when switching to "once", otherwise always false
            if (frequency === 'once') {
                this.isNow = true;  // Default to "now" for "once" frequency
            } else {
                this.isNow = false; // All other frequencies don't use now/schedule toggle
            }
        }

        this.updateDateControls();
    }

    selectNowOrSchedule(isNow) {
        this.isNow = isNow;

        this.taskSettings.elements.nowBtn && this.taskSettings.elements.nowBtn.classList.toggle('active', isNow);
        this.taskSettings.elements.scheduleDateBtn && this.taskSettings.elements.scheduleDateBtn.classList.toggle('active', !isNow);

        this.updateDateControls();
    }

    updateDateControls() {
        const dayOfWeek = this.taskSettings.elements.dayOfWeekSelect;
        const dayOfMonth = this.taskSettings.elements.dayOfMonthSelect;
        const dateInput = this.taskSettings.elements.dateInput;
        const nowOrDateChoice = this.taskSettings.elements.nowOrDateChoice;
        const timeControl = this.taskSettings.elements.timeControl;

        // Hide all controls first
        if (dayOfWeek) {
            dayOfWeek.classList.add('hidden');
        }
        if (dayOfMonth) {
            dayOfMonth.classList.add('hidden');
        }
        if (dateInput) {
            dateInput.classList.add('hidden');
        }
        if (nowOrDateChoice) {
            nowOrDateChoice.classList.add('hidden');
        }
        if (timeControl) {
            timeControl.classList.add('hidden');
        }

        // Show controls based on frequency
        if (this.currentFrequency === 'once') {
            // ONLY show now/schedule toggle for "once" frequency
            if (nowOrDateChoice) {
                nowOrDateChoice.classList.remove('hidden');
            }

            // ONLY show date/time inputs when "schedule" is selected (isNow = false)
            if (!this.isNow) {
                if (dateInput) {
                    dateInput.classList.remove('hidden');
                }
                if (timeControl) {
                    timeControl.classList.remove('hidden');
                }
            }
            // When "now" is selected (isNow = true), time-control stays COMPLETELY HIDDEN

        } else if (this.currentFrequency === 'daily') {
            // show time only
            if (timeControl) {
                timeControl.classList.remove('hidden');
            }
        } else if (this.currentFrequency === 'weekly') {
            if (dayOfWeek) {
                dayOfWeek.classList.remove('hidden');
            }
            if (timeControl) {
                timeControl.classList.remove('hidden');
            }
        } else if (this.currentFrequency === 'monthly') {
            if (dayOfMonth) {
                dayOfMonth.classList.remove('hidden');
            }
            if (timeControl) {
                timeControl.classList.remove('hidden');
            }
        }

        // Update button states ONLY for "once" frequency
        if (this.currentFrequency === 'once') {
            this.taskSettings.elements.nowBtn && this.taskSettings.elements.nowBtn.classList.toggle('active', this.isNow);
            this.taskSettings.elements.scheduleDateBtn && this.taskSettings.elements.scheduleDateBtn.classList.toggle('active', !this.isNow);
        }
    }

    generateScheduleText() {
        const time = this.taskSettings.elements.timeInput.value || '12:00';

        switch (this.currentFrequency) {
            case 'once':
                if (this.isNow) {
                    return 'NOW';
                }
                const date = this.taskSettings.elements.dateInput.value;
                return date ? `ONCE - ${date} - ${time}` : `ONCE - ${time}`;
            case 'daily':
                return `DAILY - ${time}`;
            case 'weekly':
                const dayName = this.taskSettings.elements.dayOfWeekSelect.options[this.taskSettings.elements.dayOfWeekSelect.selectedIndex].text;
                return `WEEKLY - ${dayName} - ${time}`;
            case 'monthly':
                const dayOfMonth = this.taskSettings.elements.dayOfMonthSelect.value;
                return `MONTHLY - ${dayOfMonth} - ${time}`;
            default:
                return `${this.currentFrequency} - ${time}`;
        }
    }

    parseScheduleText(scheduleText) {
        if (!scheduleText || scheduleText.trim() === '') {
            return {
                frequency: 'once',
                isNow: true,
                time: '12:00',
                date: '',
                dayOfWeek: 1,
                dayOfMonth: 1
            };
        }

        const schedule = scheduleText.trim();

        // Handle NOW case
        if (schedule === 'NOW') {
            return {
                frequency: 'once',
                isNow: true,
                time: '12:00',
                date: '',
                dayOfWeek: 1,
                dayOfMonth: 1
            };
        }

        // Parse other formats: "FREQUENCY - [data] - time"
        const parts = schedule.split(' - ');
        if (parts.length < 2) {
            // Fallback to default if format is unrecognized
            return {
                frequency: 'once',
                isNow: true,
                time: '12:00',
                date: '',
                dayOfWeek: 1,
                dayOfMonth: 1
            };
        }

        const frequency = parts[0].toLowerCase();

        switch (frequency) {
            case 'once':
                if (parts.length === 3) {
                    // ONCE - date - time
                    return {
                        frequency: 'once',
                        isNow: false,
                        time: parts[2] || '12:00',
                        date: parts[1] || '',
                        dayOfWeek: 1,
                        dayOfMonth: 1
                    };
                } else if (parts.length === 2) {
                    // ONCE - time
                    return {
                        frequency: 'once',
                        isNow: false,
                        time: parts[1] || '12:00',
                        date: '',
                        dayOfWeek: 1,
                        dayOfMonth: 1
                    };
                }
                break;

            case 'daily':
                // DAILY - time
                return {
                    frequency: 'daily',
                    isNow: false,
                    time: parts[1] || '12:00',
                    date: '',
                    dayOfWeek: 1,
                    dayOfMonth: 1
                };

            case 'weekly':
                // WEEKLY - DayName - time
                const dayName = parts[1] || 'Monday';
                const dayMap = {
                    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                    'Thursday': 4, 'Friday': 5, 'Saturday': 6
                };
                return {
                    frequency: 'weekly',
                    isNow: false,
                    time: parts[2] || '12:00',
                    date: '',
                    dayOfWeek: dayMap[dayName] !== undefined ? dayMap[dayName] : 1,
                    dayOfMonth: 1
                };

            case 'monthly':
                // MONTHLY - dayOfMonth - time
                return {
                    frequency: 'monthly',
                    isNow: false,
                    time: parts[2] || '12:00',
                    date: '',
                    dayOfWeek: 1,
                    dayOfMonth: parseInt(parts[1]) || 1
                };
        }

        // Fallback to default if nothing matches
        return {
            frequency: 'once',
            isNow: true,
            time: '12:00',
            date: '',
            dayOfWeek: 1,
            dayOfMonth: 1
        };
    }

    bindFrequencyEvents() {
        if (this.taskSettings.elements.frequencyBtns && this.taskSettings.elements.frequencyBtns.forEach) {
            this.taskSettings.elements.frequencyBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectFrequency(btn.dataset.frequency);
                });
            });
        }

        // Now/Schedule button event listeners
        this.taskSettings.elements.nowBtn && this.taskSettings.elements.nowBtn.addEventListener('click', () => {
            this.selectNowOrSchedule(true);
        });
        this.taskSettings.elements.scheduleDateBtn && this.taskSettings.elements.scheduleDateBtn.addEventListener('click', () => {
            this.selectNowOrSchedule(false);
        });
    }
}
