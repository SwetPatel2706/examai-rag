import { create } from 'zustand';

const useSubjectStore = create((set) => ({
  currentSubjectId: null,   // string | null
  subjects: [],             // [{ id, name, teachers: [{id, name}], progress? }]
  setCurrentSubject: (id) => set({ currentSubjectId: id }),
  setSubjects: (subjects) => set({ subjects }),
}));

export default useSubjectStore;
