class DashboardPage {
  constructor(page) {
    this.page = page;

    this.dashboardHeader = page.locator('h6', { hasText: 'Dashboard' });

    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.logoutLink = page.locator('a', { hasText: 'Logout' });

    this.pimMenuLink = page.locator('span.oxd-main-menu-item--name', { hasText: 'PIM' });
  }

  async isDashboardVisible() {
    return this.dashboardHeader.isVisible();
  }

  async goToPIM() {
    await this.pimMenuLink.click();
  }

  async logout() {
    await this.userDropdown.click();
    await this.logoutLink.click();
  }
}

module.exports = { DashboardPage };
