class EmployeeListPage {
  constructor(page) {
    this.page = page;

    this.employeeListMenuItem = page.locator('a', { hasText: 'Employee List' });

    this.employeeIdSearchInput = page.locator('.oxd-input-group')
      .filter({ hasText: 'Employee Id' })
      .locator('input');

    this.searchButton = page.locator('button[type="submit"]');

    this.tableRows = page.locator('.oxd-table-card');
    this.rowCheckbox = page.locator('.oxd-table-card .oxd-checkbox-input').first();

    this.deleteSelectedButton = page.locator('button', { hasText: 'Delete Selected' });
    this.confirmDeleteButton = page.locator('button', { hasText: 'Yes, Delete' });

    this.successToast = page.locator('.oxd-toast-content--success');
  }

  async openEmployeeList() {
    await this.employeeListMenuItem.click();
  }

  async searchByEmployeeId(employeeId) {
    await this.employeeIdSearchInput.fill(employeeId);
    await Promise.all([
      this.page.waitForResponse((res) =>
        res.url().includes('/api/v2/pim/employees') && res.request().method() === 'GET'),
      this.searchButton.click(),
    ]);
  }

  async openFirstResult() {
    await this.tableRows.first().click();
  }

  async deleteFirstResult() {
    await this.rowCheckbox.check();
    await this.deleteSelectedButton.click();
    await this.confirmDeleteButton.click();
  }
}

module.exports = { EmployeeListPage };
