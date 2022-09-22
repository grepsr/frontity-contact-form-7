import processors from "./processors";

const MyForm = {
  state: {
    cf7: {
      forms: {},
    },
  },

  libraries: {
    html2react: {
      processors,
    },
  },

  actions: {
    cf7: {
      /**
       * Initialize the form input object in the state.
       *
       * @param {Object} state State.
       * @return {Function}
       */
      initForm:
        ({ state }) =>
        (id) => {
          if (!state.cf7.forms[id]) {
            state.cf7.forms[id] = { inputVals: {} };
          }
        },

      /**
       * Initialize the input values in the state.
       *
       * @param {Object} state State.
       * @return {Function}
       */
      initInput:
        ({ state }) =>
        ({ id, inputName }) => {
          state.cf7.forms[id].inputVals =
            "" !== inputName ? { [inputName]: "" } : {};
        },

      /**
       * Handle on change event when user enters values in the form.
       *
       * Set the input value entered by the user in the state.
       *
       * @param {Object} state State.
       * @return {Function}
       */
      changeInputValue:
        ({ state }) =>
        ({ id, inputName, value }) => {
          state.cf7.forms[id].inputVals[inputName] = value;
        },

      /**
       * Add hidden input values.
       *
       * @param {Object} state State.
       * @return {Function}
       */
      addHiddenInputs:
        ({ state }) =>
        ({ id, inputName, value }) => {
          state.cf7.forms[id].inputVals[inputName] = value;
        },

      resetFields:
        ({ state }) =>
        ({ id }) => {
          state.cf7.forms[id].inputVals = {};
          state.cf7.forms[id].invalidFields = {};
          state.cf7.forms[id].status = {};
          state.cf7.forms[id].message = {};
        },

      /**
       * Handle form submit.
       *
       * @param {Object} state State.
       * @return {Function}
       */
      sendForm:
        ({ state, actions }) =>
        async (id) => {
          const myData = state.cf7.forms[id].inputVals;

          // Create new form data to send the post request with form data.
          let formData = new FormData();

          Object.keys(myData).forEach((key) => {
            formData.append(key, myData[key]);
          });

          // CF7 REST API URL.
          const url = `${state.source.api}contact-form-7/v1/contact-forms/${id}/feedback`;

          // Post Request.
          const res = await fetch(url, {
            method: "POST",
            body: formData,
          });
          const body = await res.json();

          let invalidFieldsObj = {};
          // Set loading to false for the message to show
          state.cf7.forms[id].loading = false;

          // Clear previous errors if any
          if (state.cf7.forms[id].invalidFields) {
            state.cf7.forms[id].invalidFields = {};
          }

          const firstName = myData["first-name"];
          const lastName = myData["last-name"];
          const name = myData["first-name"] + myData["last-name"];

          /**
           * Populate state with the errors, or thank-you message...
           */
          if ("mail_sent" === body.status) {
            state.cf7.forms[id].status = "sent";
            state.cf7.forms[id].message = body.message;

            // Once the email is sent, clear the form fields.
            state.cf7.forms[id].inputVals = {};
            state.userName = firstName;

            // REDIRECT TO THANK YOU PAGE
            if (!state.router.link.includes("/browser-extensions/uninstall")) {
              if (myData["_wpcf7"] != "10224") {
                actions.router.set(`/thank-you/`);
              }
            }

            // CREATE TICKET IN JIRA
          } else if (
            "validation_failed" === body.status ||
            "mail_failed" === body.status
          ) {
            // show error fields
            window.scrollTo(0, 290);
            if (body.invalid_fields) {
              body.invalid_fields.forEach((item) => {
                document.getElementById(item.idref).parentElement.classList +=
                  " has-error";
                let errorKey = item.idref.replace(
                  "span.wpcf7-form-control-wrap.",
                  ""
                );
                if (errorKey) {
                  invalidFieldsObj[errorKey] = item.message;
                }
              });

              state.cf7.forms[id].invalidFields = invalidFieldsObj;
            }

            state.cf7.forms[id].status = "failed";

            /**
             * Populate errors from the response so React components
             * can see them and re-render appropriately
             */
            state.cf7.forms[id].validationErrors = body.message;
          }
        },
    },
  },
};

export default MyForm;
