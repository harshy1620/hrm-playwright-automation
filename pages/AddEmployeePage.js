const { expect } = require('@playwright/test');

class AddEmployeePage {
  constructor(page) {
    this.page = page;

    this.addEmployeeMenuItem = page.locator('a', { hasText: 'Add Employee' });

    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');

    // No name attribute on this input, so locate it through its label group
    this.employeeIdInput = page.locator('.oxd-input-group')
      .filter({ hasText: 'Employee Id' })
      .locator('input');

    this.profilePictureInput = page.locator('input.oxd-file-input');

    this.saveButton = page.locator('button[type="submit"]');
    this.successToast = page.locator('.oxd-toast-content--success');
  }

  async openAddEmployeeForm() {
    await this.addEmployeeMenuItem.click();
  }

  async addEmployee(employeeData) {
    await this.firstNameInput.fill(employeeData.firstName);
    await this.lastNameInput.fill(employeeData.lastName);

    // The app fills an auto-generated ID asynchronously; typing before it lands gets wiped
    await expect(this.employeeIdInput).not.toHaveValue('');
    await this.employeeIdInput.fill(employeeData.employeeId);

    if (employeeData.profilePicture) {
      await this.profilePictureInput.setInputFiles(employeeData.profilePicture);
    }

    await this.saveButton.click();
  }

  // After save the app redirects to /pim/viewPersonalDetails/empNumber/<id>
  async getCreatedEmployeeNumber() {
    await this.page.waitForURL(/viewPersonalDetails\/empNumber\/\d+/);
    const url = this.page.url();
    const match = url.match(/empNumber\/(\d+)/);
    return match ? match[1] : null;
  }
}

module.exports = { AddEmployeePage };
