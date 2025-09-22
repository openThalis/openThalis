

export class TaskManager {
    constructor() {
        this.tasks = [];
    }


    addTaskFromServer(taskObject) {
        this.tasks.unshift(taskObject);
        return taskObject;
    }


    removeTask(taskId) {
        const index = this.tasks.findIndex(task => String(task.id) === String(taskId));
        if (index !== -1) {
            this.tasks.splice(index, 1);
            return true;
        }
        return false;
    }

    
    getAllTasks() {
        return [...this.tasks];
    }


    getTask(taskId) {
        return this.tasks.find(task => String(task.id) === String(taskId));
    }


    loadTasks(tasksData) {
        this.tasks = tasksData || [];
    }
}
