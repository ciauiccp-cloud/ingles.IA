import { supabase } from "./supabase";
import { must } from "./hooks";

export type ClassRow = { id: string; name: string; level: string; schedule: string | null; description: string | null; active: boolean; created_at: string };
export type StudentRow = {
  id: string; full_name: string; email: string | null; level: string; points: number; streak: number; last_study_date: string | null;
  active: boolean; is_minor: boolean; guardian_consent: boolean; created_at: string;
};

export const fetchClasses = async () =>
  must(await supabase.from("classes").select("*").order("name")) as ClassRow[];

export const fetchStudents = async (teacherId: string) =>
  must(await supabase.from("profiles").select("*").eq("teacher_id", teacherId).eq("role", "student").order("full_name")) as StudentRow[];

export const fetchMembers = async () =>
  must(await supabase.from("class_members").select("class_id, student_id")) as { class_id: string; student_id: string }[];

/** Turmas do aluno logado. */
export const fetchMyClasses = async (studentId: string) => {
  const rows = must(await supabase.from("class_members").select("class_id, classes(*)").eq("student_id", studentId)) as any[];
  return rows.map((r) => r.classes).filter(Boolean) as ClassRow[];
};

export function weekKey(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
