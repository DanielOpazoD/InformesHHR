export function initEditController({ sheet, editPanel, toggleEditButton }) {
  const setEditMode = (active) => {
    sheet.classList.toggle('edit-mode', active);
    editPanel.style.display = active ? 'flex' : 'none';
  };

  toggleEditButton.addEventListener('click', () => {
    const active = sheet.classList.contains('edit-mode');
    setEditMode(!active);
  });

  document.addEventListener('pointerdown', (event) => {
    if (!sheet.classList.contains('edit-mode')) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (
      editPanel.contains(target) ||
      toggleEditButton.contains(target) ||
      target.closest('.sec-del') ||
      target.closest('.row-del')
    ) {
      return;
    }
    setEditMode(false);
  });

  return { setEditMode };
}
