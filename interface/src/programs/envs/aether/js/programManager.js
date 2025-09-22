export class ProgramManager {
    constructor() {
        this.programs = [];
    }

    addProgram(programData) {
        // Check if program already exists to prevent duplicates
        if (this.getProgram(programData.id)) {
            console.warn('Program with ID', programData.id, 'already exists, skipping duplicate');
            return programData;
        }
        
        // Add program from server and sort by updated_at (newest first)
        this.programs.push(programData);
        this.sortProgramsByUpdatedAt();
        return programData;
    }

    removeProgram(programId) {
        const index = this.programs.findIndex(program => String(program.id) === String(programId));
        if (index !== -1) {
            this.programs.splice(index, 1);
            // No need to re-sort after removal since order is maintained
            return true;
        }
        return false;
    }

    updateProgram(programId, updatedData) {
        const program = this.getProgram(programId);
        if (program) {
            Object.assign(program, updatedData);
            // Re-sort programs after update to maintain order
            this.sortProgramsByUpdatedAt();
            return program;
        }
        return null;
    }

    getAllPrograms() {
        return [...this.programs];
    }

    getProgram(programId) {
        return this.programs.find(program => String(program.id) === String(programId));
    }

    loadPrograms(programsData) {
        this.programs = programsData || [];
        
        // Sort programs by updated_at (newest first)
        this.sortProgramsByUpdatedAt();
    }

    sortProgramsByUpdatedAt() {
        this.programs.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0);
            const dateB = new Date(b.updated_at || b.created_at || 0);
            return dateB - dateA; // Descending order (newest first)
        });
    }
}
