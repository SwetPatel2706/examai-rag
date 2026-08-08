/** Shared material/file-type icon config used across teacher and student views. */
export const TYPE_ICONS = {
  PDF: { icon: 'picture_as_pdf', bg: 'bg-primary/5', color: 'text-primary' },
  DOCX: { icon: 'description', bg: 'bg-tertiary-container/10', color: 'text-tertiary' },
  PPTX: { icon: 'slideshow', bg: 'bg-secondary-container/30', color: 'text-secondary' },
  XLSX: { icon: 'table_chart', bg: 'bg-tertiary-fixed/30', color: 'text-green-600' },
  FOLDER: { icon: 'folder', bg: 'bg-primary/5', color: 'text-primary' },
  DOC: { icon: 'article', bg: 'bg-primary-fixed', color: 'text-blue-500' },
  default: { icon: 'description', bg: 'bg-surface-container', color: 'text-secondary' },
};

export function getTypeConfig(type) {
  return TYPE_ICONS[type?.toUpperCase()] ?? TYPE_ICONS.default;
}
export function groupByTeacher(items) {
  const groups = [];
  const byTeacher = new Map();
  for (const mat of items || []) {
    const key = mat.teacherId;
    if (!byTeacher.has(key)) {
      const group = { teacher: { id: key, name: mat.teacherName || 'Unknown' }, materials: [] };
      byTeacher.set(key, group);
      groups.push(group);
    }
    byTeacher.get(key).materials.push({ id: mat.id, name: mat.name, type: mat.fileType });
  }
  return groups;
}
