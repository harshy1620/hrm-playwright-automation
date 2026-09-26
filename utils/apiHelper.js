// Pass page.request so calls reuse the UI login session cookies
const API_BASE = '/web/index.php/api/v2/pim/employees';

class ApiHelper {
  constructor(request) {
    this.request = request;
  }

  async findEmployeeByEmployeeId(employeeId) {
    const response = await this.request.get(API_BASE, { params: { nameOrId: employeeId } });
    const body = await response.json();
    return {
      status: response.status(),
      employee: body.data.find((emp) => emp.employeeId === employeeId) || null,
    };
  }

  // Returns 404 when the employee has no photo
  async getProfilePicture(empNumber) {
    const response = await this.request.get(`${API_BASE}/${empNumber}/picture`);
    const body = await response.json();
    return {
      status: response.status(),
      picture: response.ok() ? body.data : null,
    };
  }

  async getJobDetails(empNumber) {
    const response = await this.request.get(`${API_BASE}/${empNumber}/job-details`);
    const body = await response.json();
    return {
      status: response.status(),
      jobTitle: body.data.jobTitle.title,
      employmentStatus: body.data.empStatus.name,
    };
  }
}

module.exports = { ApiHelper };
