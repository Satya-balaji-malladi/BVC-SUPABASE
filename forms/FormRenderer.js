/**
 * FormRenderer.js
 * Template renderer for attendance verification modals, forms, and badges.
 */
if (typeof window !== 'undefined') {
  window.AttendanceFormRenderer = (() => {
    'use strict';

  const escapeHtml = (str) => {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const renderBadge = (text, type = 'dept') => {
    const safeText = escapeHtml(text || 'N/A');
    return `<span class="af-badge af-badge-${type} me-1 mb-1">${safeText}</span>`;
  };

  const renderProfileCard = (student, eventConfig = {}) => {
    const name = escapeHtml(student.student_name || student.name || 'Student');
    const roll = escapeHtml(student.roll_number || student.roll || 'N/A');
    const dept = escapeHtml(student.department || student.branch || 'N/A');
    const year = escapeHtml(student.year ? `${student.year} Year` : 'N/A');
    const college = escapeHtml(student.college_name || student.college || 'BVC Engineering College');

    const photoUrl = student.profile_photo || student.photo_url;
    const avatarHtml = photoUrl
      ? `<img src="${escapeHtml(photoUrl)}" class="af-avatar-img" alt="${name}" />`
      : `<i class="bi bi-person-fill af-avatar-placeholder"></i>`;

    return `
      <div class="af-profile-card text-center mb-3">
        <div class="af-avatar-wrapper mb-2">
          ${avatarHtml}
        </div>
        <h5 class="fw-bold mb-1">${name}</h5>
        <p class="text-muted font-monospace small mb-2">${roll}</p>
        <div class="d-flex flex-wrap justify-content-center gap-1 mb-2">
          ${renderBadge(dept, 'dept')}
          ${renderBadge(year, 'year')}
          ${renderBadge('Active', 'status')}
        </div>
        <div class="small text-muted border-top pt-2 mt-1">
          <i class="bi bi-building me-1"></i> ${college}
        </div>
      </div>
    `;
  };

  const renderDuplicateNotice = (details) => {
    const time = escapeHtml(details.timestamp ? new Date(details.timestamp).toLocaleTimeString() : 'Earlier');
    const coord = escapeHtml(details.coordinator || 'Coordinator');

    return `
      <div class="text-center py-4">
        <div class="mb-3 text-warning">
          <i class="bi bi-exclamation-triangle-fill display-1"></i>
        </div>
        <h4 class="fw-bold text-dark mb-2">Attendance Already Marked</h4>
        <p class="text-muted mb-4">This participant has already been marked present for this event.</p>
        <div class="p-3 bg-light rounded-3 d-inline-block text-start border mb-3" style="min-width: 280px;">
          <div class="small text-muted mb-1"><i class="bi bi-clock me-1"></i> <strong>Time:</strong> ${time}</div>
          <div class="small text-muted"><i class="bi bi-person-badge me-1"></i> <strong>Marked By:</strong> ${coord}</div>
        </div>
      </div>
    `;
  };

  return {
    escapeHtml,
    renderBadge,
    renderProfileCard,
    renderDuplicateNotice
  };
})();
}
