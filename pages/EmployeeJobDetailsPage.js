class EmployeeJobDetailsPage {
  constructor(page) {
    this.page = page;

    this.jobTab = page.locator('a.orangehrm-tabs-item', { hasText: /^Job$/ });
    this.formLoader = page.locator('.oxd-form-loader');

    // Custom dropdowns, not native <select>, so selectOption() won't work
    this.jobTitleDropdown = page.locator('.oxd-input-group')
      .filter({ hasText: 'Job Title' })
      .locator('.oxd-select-text');

    this.employmentStatusDropdown = page.locator('.oxd-input-group')
      .filter({ hasText: 'Employment Status' })
      .locator('.oxd-select-text');

    // Exact match: other users on the shared demo add look-alikes such as "QA Engineer-123"
    this.dropdownOption = (optionText) =>
      page.locator('.oxd-select-option').getByText(optionText, { exact: true });

    this.saveButton = page.locator('button[type="submit"]');
    this.successToast = page.locator('.oxd-toast-content--success');
  }

  async openJobTab() {
    await this.jobTab.click();
    await this.waitForFormLoaded();
  }

  // Dropdown values get overwritten if touched before the saved data loads
  async waitForFormLoaded() {
    await this.page.waitForURL(/viewJobDetails/);
    await this.formLoader.waitFor({ state: 'hidden' });
  }

  async selectDropdownOption(dropdownLocator, optionText) {
    await dropdownLocator.click();
    await this.dropdownOption(optionText).click();
  }

  async updateJobTitle(newTitle) {
    await this.selectDropdownOption(this.jobTitleDropdown, newTitle);
  }

  async updateEmploymentStatus(newStatus) {
    await this.selectDropdownOption(this.employmentStatusDropdown, newStatus);
  }

  async save() {
    await this.saveButton.click();
  }

  async getCurrentJobTitle() {
    return this.jobTitleDropdown.innerText();
  }

  async getCurrentEmploymentStatus() {
    return this.employmentStatusDropdown.innerText();
  }
}

module.exports = { EmployeeJobDetailsPage };
