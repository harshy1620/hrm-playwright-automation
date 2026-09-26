const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const { LoginPage } = require('../pages/LoginPage');
const { DashboardPage } = require('../pages/DashboardPage');
const { AddEmployeePage } = require('../pages/AddEmployeePage');
const { EmployeeListPage } = require('../pages/EmployeeListPage');
const { EmployeeJobDetailsPage } = require('../pages/EmployeeJobDetailsPage');
const { ApiHelper } = require('../utils/apiHelper');

const testData = require('../test-data/employee.json');

const VALID_USERNAME = 'Admin';
const VALID_PASSWORD = 'admin123';

test.describe('Employee Lifecycle Management - OrangeHRM', () => {

  test('Complete Employee Lifecycle: Add -> Edit -> API Validate -> Delete -> Logout', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const addEmployeePage = new AddEmployeePage(page);
    const employeeListPage = new EmployeeListPage(page);
    const jobDetailsPage = new EmployeeJobDetailsPage(page);
    const apiHelper = new ApiHelper(page.request);

    // The demo site is shared, so a fixed ID could already be taken
    const employee = {
      ...testData.newEmployee,
      employeeId: `${testData.newEmployee.employeeIdPrefix}${Date.now().toString().slice(-8)}`,
    };
    const { jobTitle, employmentStatus } = testData.updatedJobDetails;
    let empNumber;

    await test.step('Step 1: Login with valid credentials', async () => {
      await loginPage.goto();
      await loginPage.login(VALID_USERNAME, VALID_PASSWORD);

      await expect(
        dashboardPage.dashboardHeader,
        'Dashboard header should be visible after successful login'
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step('Step 2: Add a new employee via PIM module', async () => {
      await dashboardPage.goToPIM();
      await addEmployeePage.openAddEmployeeForm();
      await addEmployeePage.addEmployee(employee);

      await expect(
        addEmployeePage.successToast,
        'A success message should appear after saving the new employee'
      ).toBeVisible();

      empNumber = await addEmployeePage.getCreatedEmployeeNumber();
      expect(empNumber, 'A new employee number should be generated after saving').not.toBeNull();

      await expect(
        addEmployeePage.firstNameInput,
        'Personal Details should show the first name that was entered'
      ).toHaveValue(employee.firstName);
    });

    await test.step('Step 3: Search employee by ID and edit job details', async () => {
      await dashboardPage.goToPIM();
      await employeeListPage.openEmployeeList();
      await employeeListPage.searchByEmployeeId(employee.employeeId);

      await expect(
        employeeListPage.tableRows,
        `Exactly one employee with ID ${employee.employeeId} should be found`
      ).toHaveCount(1);

      await employeeListPage.openFirstResult();
      await jobDetailsPage.openJobTab();
      await jobDetailsPage.updateJobTitle(jobTitle);
      await jobDetailsPage.updateEmploymentStatus(employmentStatus);
      await jobDetailsPage.save();

      await expect(
        jobDetailsPage.successToast,
        'A success message should appear after updating job details'
      ).toBeVisible();

      await page.reload();
      await jobDetailsPage.waitForFormLoaded();

      await expect(
        jobDetailsPage.jobTitleDropdown,
        'Job Title should still show the updated value after a page reload'
      ).toHaveText(jobTitle);
      await expect(
        jobDetailsPage.employmentStatusDropdown,
        'Employment Status should still show the updated value after a page reload'
      ).toHaveText(employmentStatus);
    });

    await test.step('Step 4: Validate employee data via API', async () => {
      const search = await apiHelper.findEmployeeByEmployeeId(employee.employeeId);
      expect(search.status, 'Employee search API should respond with 200').toBe(200);
      expect(search.employee, `API should return the employee with ID ${employee.employeeId}`).not.toBeNull();

      expect(String(search.employee.empNumber), 'API empNumber should match the one in the UI URL').toBe(empNumber);
      expect(search.employee.firstName, 'API first name should match the UI').toBe(employee.firstName);
      expect(search.employee.lastName, 'API last name should match the UI').toBe(employee.lastName);

      const uiJobTitle = await jobDetailsPage.getCurrentJobTitle();
      const uiEmploymentStatus = await jobDetailsPage.getCurrentEmploymentStatus();
      const job = await apiHelper.getJobDetails(empNumber);

      expect(job.status, 'Job details API should respond with 200').toBe(200);
      expect(job.jobTitle, 'API Job Title should match the value shown in the UI').toBe(uiJobTitle);
      expect(job.employmentStatus, 'API Employment Status should match the value shown in the UI').toBe(uiEmploymentStatus);

      const photo = await apiHelper.getProfilePicture(empNumber);
      const uploadedFile = employee.profilePicture;
      expect(photo.status, 'Profile picture API should find the photo uploaded in Step 2').toBe(200);
      expect(photo.picture.filename, 'Stored photo should be the file that was uploaded').toBe(path.basename(uploadedFile));
      expect(Number(photo.picture.size), 'Stored photo size should match the uploaded file').toBe(fs.statSync(uploadedFile).size);
    });

    await test.step('Step 5: Delete the employee from UI and verify via UI and API', async () => {
      await dashboardPage.goToPIM();
      await employeeListPage.openEmployeeList();
      await employeeListPage.searchByEmployeeId(employee.employeeId);
      await expect(employeeListPage.tableRows, 'Employee should be listed before deletion').toHaveCount(1);

      await employeeListPage.deleteFirstResult();
      await expect(
        employeeListPage.successToast,
        'A success message should appear after deleting the employee'
      ).toBeVisible();

      await employeeListPage.searchByEmployeeId(employee.employeeId);
      await expect(
        employeeListPage.tableRows,
        'Employee should no longer appear in the list after deletion'
      ).toHaveCount(0);

      const search = await apiHelper.findEmployeeByEmployeeId(employee.employeeId);
      expect(search.status, 'Employee search API should respond with 200').toBe(200);
      expect(search.employee, 'API should no longer return the deleted employee').toBeNull();
    });

    await test.step('Step 6: Logout and confirm session is invalidated', async () => {
      await dashboardPage.logout();

      await expect(
        loginPage.usernameInput,
        'Username field should be visible again, confirming logout was successful'
      ).toBeVisible();

      // A protected URL should redirect to login once the session is gone
      await page.goto('/web/index.php/dashboard/index');
      await expect(
        loginPage.usernameInput,
        'Opening the dashboard URL after logout should redirect to login'
      ).toBeVisible();

      const apiAfterLogout = await page.request.get('/web/index.php/api/v2/pim/employees');
      expect(apiAfterLogout.status(), 'API should reject requests once the session is invalidated').toBe(401);
    });
  });
});
