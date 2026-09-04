import { apiClient, unwrap } from "./apiClient";

export interface SubjectOption {
  code: string;
  label: string;
  /**
   * False when the API fell back to its static table because this board and
   * grade have not been seeded. The picker still shows the subject, because
   * showing nothing would be worse, but a plan built from it will be
   * off-syllabus and the API will say so.
   */
  hasCurriculum: boolean;
}

export const referenceApi = {
  /**
   * The subjects a specific child can actually be taught.
   *
   * Board and grade, not a global list: the syllabus differs by both, and a
   * picker that offers Hindi to a Grade 1 child with no Hindi topics behind it
   * is a dead end the parent only discovers after waiting for a generation.
   */
  async subjects(board: string, grade: number) {
    return unwrap<SubjectOption[]>(
      apiClient.get("/reference/subjects", { params: { board, grade } }),
    );
  },
};
