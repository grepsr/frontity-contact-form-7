const fetch = require("cross-fetch");

class JiraServiceDesk {
  constructor() {
    this.api_key_dev = "LSiq6WiESaL45mS4YJfC4BC0";
    this.api_key_live = "LSiq6WiESaL45mS4YJfC4BC0";
    this.api_base_url = "https://grepsr.atlassian.net";
    this.jira_account = "developers@grepsr.com";
    this.api_key = "LSiq6WiESaL45mS4YJfC4BC0";
    this.support_enquiry = "Support Inquiry";
    this.sales_enquiry = "Sales Inquiry";
    this.requestTypes = {
      dev: 52,
      prd: 36,
    };
    this.serviceDeskId = {
      dev: 6,
      prd: 3,
    };
    // TODO: Change to live in production.
    this.app_env = "dev";
  }

  async integrateJiraSupportInquiry(formDetail) {
    await this.getRequestType(this.service_desk_id);
    const customerId = this.createCustomer(
      this.service_desk_id,
      formDetail["email"],
      formDetail["first_name"],
      formDetail["last_name"]
    );
    if (customerId) {
      await this.createCustomerRequest(
        customerId,
        this.service_desk_id,
        this.requestTypes[this.support_enquiry],
        formDetail
      );
    }
  }

  async integrateJiraSalesInquiry(formDetail) {
    // await this.getRequestType(this.service_desk_id);
    const customerId = await this.createCustomer(
      this.serviceDeskId[this.app_env],
      formDetail["email"],
      formDetail["first_name"],
      formDetail["last_name"]
    );
    if (customerId) {
      await this.createCustomerRequest(
        customerId,
        this.serviceDeskId[this.app_env],
        this.requestTypes[this.app_env],
        formDetail
      );
    }
  }

  async createCustomerRequest(customerId, deckId, requestType, formDetail) {
    const firstname = formDetail["first_name"];
    const lastname = formDetail["last_name"];
    const email = formDetail["email"];
    const phone = formDetail["phone"];
    const company_name = formDetail["company_name"];
    const job_title = formDetail["job_title"];
    const current_method_of_data_extraction =
      formDetail["current_method_of_data_extraction"];
    const how_can_we_help = formDetail["how_can_we_help"];
    const page_url = formDetail["page_url"];
    const referrer = formDetail["referrer"] ? formDetail["referrer"] : "";

    const apiUrl = "/rest/servicedeskapi/request";
    const data = {};
    data["serviceDeskId"] = deckId;
    data["requestTypeId"] = requestType;
    data["raiseOnBehalfOf"] = customerId;
    data["requestParticipants"] = [customerId];

    let description = "";
    let summaryLabel = "Contact Us";
    let fieldValues = {};

    if (/contact-us/i.test(page_url)) {
      description += " *Inquiry Type:* Contact Us" + "";
      summaryLabel = "Contact Us";
    } else if (/get-a-quote/i.test(page_url)) {
      description += " *Inquiry Type:* Get a Quote" + "";
      summaryLabel = "Get a Quote";
    } else if (/schedule-a-meeting/i.test(page_url)) {
      description += " *Inquiry Type:* Schedule a Meeting" + "";
      summaryLabel = "Schedule a Meeting";
    } else if (/contact-sales/i.test(page_url)) {
      description += " *Inquiry Type:* Contact Sales" + "";
      summaryLabel = "Contact Sales";
    } else {
      description += " *Inquiry Type:* Contact Us" + "";
      summaryLabel = "Contact Us";
    }

    description += " *Name:* " + firstname + " " + lastname + "";
    description += " *Email:* " + email + "";
    if (phone) {
      description += " *Phone:* " + phone + "";
    }

    if (company_name) {
      description += " *Company:* " + company_name;

      // orgId = this.createOrganization(deckId, company_name);
      // if (orgId) {
      //     apiUrl1 = '/rest/servicedeskapi/organization/' + orgId + '/user';
      //     data = array();
      //     data['accountIds'] = [customerId];
      //     a = this.sendRequest('POST', apiUrl1, data);
      // }
    }

    if (job_title) {
      description += " *Job Title:* " + job_title;
    }

    description +=
      " *Method of Data Extraction:* " + current_method_of_data_extraction;
    description += " *Message:* " + how_can_we_help;

    fieldValues["summary"] =
      firstname + " " + lastname + " / Grepsr - " + summaryLabel;
    fieldValues["description"] = description;

    if (referrer != "") {
      fieldValues["customfield_10080"] = referrer;
    }

    data["requestFieldValues"] = fieldValues;

    console.log(data);
    const ret = await this.sendRequest("POST", apiUrl, data);
    console.log(ret);
  }

  async getServiceDesk() {
    const apiUrl = "/rest/servicedeskapi/servicedesk";
    const ret = await this.sendRequest("GET", apiUrl);
    let deckId = 0;
    if (ret) {
      const values = ret["values"];
      for (let i = 0; i < values.length; i += 1) {
        if (values["projectName"] == "Messaging & Collaboration") {
          deckId = values["id"];
        }
      }
    }
    this.service_desk_id = deckId;
    return deckId;
  }

  async createCustomer(serviceDeskId, email, firstname, lastname) {
    const customer = this.getCustomer(serviceDeskId, email);
    if (!customer) {
      const apiUrl = "/rest/servicedeskapi/customer";
      const data = {};
      data["displayName"] = firstname + " " + lastname;
      data["email"] = email;
      const ret = await this.sendRequest("POST", apiUrl, data);
      if (ret) {
        if (ret["accountId"]) {
          return ret["accountId"];
        }
      }
    } else {
      return customer;
    }
    return;
  }

  async getCustomer(serviceDeskId, email) {
    const apiUrl =
      "/rest/servicedeskapi/servicedesk/" +
      serviceDeskId +
      "/customer?limit=50&query=" +
      encodeURIComponent(email);
    const ret = await this.sendRequest("GET", apiUrl);
    if (ret && ret["values"]) {
      return ret["values"][0]["accountId"];
    }
    return;
  }

  async getRequestType(serviceDeskId) {
    const apiUrl =
      "/rest/servicedeskapi/servicedesk/" + serviceDeskId + "/requesttype";
    const ret = await this.sendRequest("GET", apiUrl);
    if (ret && ret["values"]) {
      const values = ret["values"];
      for (let i = 0; i < values.length; i += 1) {
        this.requestTypes[values[i]["name"]] = values[i]["id"];
      }
    }
  }

  async createOrganization(serviceDeskId, org) {
    const apiUrl = "/rest/servicedeskapi/organization";
    const data = {};
    data["name"] = org;
    let orgId = null;
    try {
      const ret = await this.sendRequest("POST", apiUrl, data);
      if (ret) {
        if (ret["id"]) {
          const apiUrl =
            "/rest/servicedeskapi/servicedesk/" +
            serviceDeskId +
            "/organization";
          const data = {};
          data["organizationId"] = ret["id"];
          try {
            const ret = await this.sendRequest("POST", apiUrl, data);
            if (ret) {
              if (ret["id"]) {
                orgId = ret["id"];
              }
            }
          } catch (err) {}
        }
      }
    } catch (err) {}

    return orgId;
  }

  async sendRequest(type = "POST", url, data = {}) {
    if (type == "POST") {
      const token = this.jira_account + ":" + this.api_key;
      const code = Buffer.from(token).toString("base64");
      const res = await fetch(`${this.api_base_url}${url}`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          mode: "no-cors",
          "Access-Control-Allow-Origin": "*",
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Basic " + code,
        },
      });
      const response = await res.json();
      return response;
    }

    if (type == "GET") {
      const token = this.jira_account + ":" + this.api_key;
      const code = Buffer.from(token).toString("base64");
      const res = await fetch(`${this.api_base_url}${url}`, {
        method: "GET",
        headers: {
          mode: "no-cors",
          "Access-Control-Allow-Origin": "*",
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "Basic " + code,
          "X-ExperimentalApi": "opt-in",
        },
      });
      const response = await res.json();
      return response;
    }
  }
}
export default JiraServiceDesk;

// const test = async () => {
//   const c = new JiraServiceDesk();
//   const form = {
//     email: "roshan619+00723@gmail.com",
//     first_name: "Roshan",
//     last_name: "A",
//     phone: "+123453",
//     company_name: "Grepsr",
//     current_method_of_data_extraction: "Testing",
//     how_can_we_help: "Currently debugging",
//     page_url: "https://www.grepsr.com/contact-sales/",
//   };
//   await c.integrateJiraSalesInquiry(form);
// };

// test();
