/**
 * TopBarMenu - Main menu bar with dropdown menus
 * Provides File, Edit, and Format menus above the toolbar
 */
class TopBarMenu {
  constructor(container, spreadsheet) {
    this.container = container;
    this.spreadsheet = spreadsheet;
    this.activeMenu = null;
    this.menuElements = {};
    this.dropdownElements = {};

    this.menus = this._defineMenus();
    this._render();
    this._setupEventListeners();
  }

  _defineMenus() {
    return [
      {
        id: 'file',
        label: 'File',
        items: [
          { id: 'new', label: 'New', action: () => console.log('Menu action: New') },
          { id: 'open', label: 'Open', action: () => console.log('Menu action: Open') },
          { id: 'delete', label: 'Delete', action: () => console.log('Menu action: Delete') }
        ]
      },
      {
        id: 'edit',
        label: 'Edit',
        items: [
          { id: 'undo', label: 'Undo', action: () => console.log('Menu action: Undo') },
          { id: 'redo', label: 'Redo', action: () => console.log('Menu action: Redo') },
          { id: 'copy', label: 'Copy', action: () => console.log('Menu action: Copy') },
          { id: 'paste', label: 'Paste', action: () => console.log('Menu action: Paste') },
          { id: 'cut', label: 'Cut', action: () => console.log('Menu action: Cut') }
        ]
      },
      {
        id: 'format',
        label: 'Format',
        items: [
          { id: 'bold', label: 'Bold', action: () => console.log('Menu action: Bold') },
          { id: 'italic', label: 'Italic', action: () => console.log('Menu action: Italic') }
        ]
      }
    ];
  }

  _render() {
    this.container.innerHTML = '';
    this.container.className = 'menu-bar';

    this.menus.forEach(menu => {
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.dataset.menuId = menu.id;
      menuItem.textContent = menu.label;
      this.menuElements[menu.id] = menuItem;

      const dropdown = this._createDropdown(menu);
      this.dropdownElements[menu.id] = dropdown;

      this.container.appendChild(menuItem);
      document.body.appendChild(dropdown);
    });
  }

  _createDropdown(menu) {
    const dropdown = document.createElement('div');
    dropdown.className = 'menu-dropdown';
    dropdown.dataset.menuId = menu.id;

    menu.items.forEach(item => {
      const dropdownItem = document.createElement('div');
      dropdownItem.className = 'menu-dropdown-item';
      dropdownItem.dataset.actionId = item.id;
      dropdownItem.textContent = item.label;
      dropdown.appendChild(dropdownItem);
    });

    return dropdown;
  }

  _setupEventListeners() {
    // Menu item clicks
    this.container.addEventListener('click', (e) => {
      const menuItem = e.target.closest('.menu-item');
      if (menuItem) {
        const menuId = menuItem.dataset.menuId;
        if (this.activeMenu === menuId) {
          this._hideDropdown();
        } else {
          this._showDropdown(menuId);
        }
      }
    });

    // Dropdown item clicks
    document.addEventListener('click', (e) => {
      const dropdownItem = e.target.closest('.menu-dropdown-item');
      if (dropdownItem) {
        const dropdown = dropdownItem.closest('.menu-dropdown');
        const menuId = dropdown.dataset.menuId;
        const actionId = dropdownItem.dataset.actionId;
        this._handleAction(menuId, actionId);
        this._hideDropdown();
        this._refocusGrid();
        return;
      }

      // Click outside - close menu
      if (this.activeMenu && !e.target.closest('.menu-item') && !e.target.closest('.menu-dropdown')) {
        this._hideDropdown();
      }
    });
  }

  _showDropdown(menuId) {
    // Hide any currently open dropdown
    if (this.activeMenu) {
      this._hideDropdown();
    }

    const menuItem = this.menuElements[menuId];
    const dropdown = this.dropdownElements[menuId];

    // Position dropdown below menu item
    const rect = menuItem.getBoundingClientRect();
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.top = `${rect.bottom}px`;
    dropdown.style.display = 'block';

    menuItem.classList.add('active');
    this.activeMenu = menuId;
  }

  _hideDropdown() {
    if (!this.activeMenu) return;

    const menuItem = this.menuElements[this.activeMenu];
    const dropdown = this.dropdownElements[this.activeMenu];

    menuItem.classList.remove('active');
    dropdown.style.display = 'none';
    this.activeMenu = null;
  }

  _handleAction(menuId, actionId) {
    const menu = this.menus.find(m => m.id === menuId);
    if (!menu) return;

    const item = menu.items.find(i => i.id === actionId);
    if (item && item.action) {
      item.action();
    }
  }

  _refocusGrid() {
    if (this.spreadsheet && this.spreadsheet.renderer) {
      this.spreadsheet.renderer.cellGridContainer.focus();
    }
  }
}

export { TopBarMenu };
