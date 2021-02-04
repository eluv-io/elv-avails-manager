import React from "react";
import {inject, observer} from "mobx-react";
import {DeleteButton, InitPSF} from "./Misc";
import {Action, Checkbox, DateSelection, LabelledField, LoadingElement, Modal} from "elv-components-js";
import ContentBrowser from "./ContentBrowser";
import Groups from "./Groups";
import PropTypes from "prop-types";

@inject("rootStore")
@observer
class NTPForms extends React.Component {
  constructor(props) {
    super(props);

    let additionalState = {
      completed: 0,
      total: 0,
      useEmails: false,
      emails: "",
      count: 1,
      name: "",
      ntpId: "",
      objectId: "",
      groups: [],
      ticketLength: 6,
      maxTickets: 0,
      maxRedemptions: 100,
      start: undefined,
      end: undefined,
      loading: false
    };

    if(this.props.edit && this.props.ntpId) {
      const ntp = this.props.rootStore.allNTPInstances[this.props.ntpId];

      additionalState = {
        ...additionalState,
        name: ntp.name,
        ntpId: ntp.ntpId,
        maxTickets: ntp.maxTickets,
        maxRedemptions: ntp.maxRedemptions,
        start: ntp.startTime,
        end: ntp.endTime
      };
    }

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({
      sortKey: "name",
      error: undefined,
      additionalState
    });

    this.SelectTargetObject = this.SelectTargetObject.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
  }

  componentDidMount() {
    this.SelectTargetObject({objectId: this.props.rootStore.objectId});

    this.setState({error: undefined});
  }

  NTP() {
    return this.props.rootStore.allNTPInstances[this.props.ntpId];
  }

  CreateNTPInstanceForm() {
    return (
      <form
        className="ntp-instance-form ntp-instance-create-form"
        onSubmit={async event => {
          event.preventDefault();

          try {
            this.setState({loading: true, error: undefined});

            const ntpId = await this.props.rootStore.CreateNTPInstance({
              name: this.state.name,
              ticketLength: this.state.ticketLength,
              maxTickets: this.state.maxTickets,
              maxRedemptions: this.state.maxRedemptions,
              start: this.state.start,
              end: this.state.end,
              objectId: this.state.objectId,
              groupAddresses: this.state.groups.map(group => group.address)
            });

            await this.props.onComplete(ntpId, this.state.name);
          } catch (error) {
            this.setState({error: "Failed to create NTP Instance"});
            this.props.rootStore.LogError("Failed to create NTP Instance", error);
          } finally {
            this.setState({loading: false});
          }
        }}
      >
        <h1>Create New NTP Instance</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">{ this.state.error }</div>
        <LabelledField label="Name">
          <input
            required
            value={this.state.name}
            onChange={event => this.setState({name: event.target.value, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Start Time (optional)">
          <DateSelection
            readOnly
            noLabel
            value={this.state.start}
            onChange={dateTime => this.setState({start: dateTime, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="End Time (optional)">
          <DateSelection
            readOnly
            noLabel
            value={this.state.end}
            onChange={dateTime => this.setState({end: dateTime, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Ticket Length">
          <input
            type="number"
            step={1}
            required
            value={this.state.ticketLength}
            onChange={event => this.setState({ticketLength: event.target.value, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Max Issuable Tickets (0 for no limit)">
          <input
            required
            type="number"
            step={1}
            value={this.state.maxTickets}
            onChange={event => this.setState({maxTickets: event.target.value, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Max Redemptions per Ticket">
          <input
            required
            type="number"
            step={1}
            value={this.state.maxRedemptions}
            onChange={event => this.setState({maxRedemptions: event.target.value, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Target Object" className="align-top">
          <div className="controls">
            <Action onClick={() => this.ActivateModal("object")}>Select Target Object</Action>
          </div>
          <div className="list">
            {
              !this.state.objectId ? null :
                <div
                  key={`ntp-target-object-${this.state.objectId}`}
                  className="list-entry ntp-object-list-entry odd"
                >
                  <div title={this.state.objectDisplayTitle}>{ this.state.objectDisplayTitle }</div>
                </div>
            }
          </div>
        </LabelledField>
        <LabelledField label="Groups" className="align-top">
          <div className="controls">
            <Action onClick={() => this.ActivateModal("group")}>Add a Group</Action>
          </div>
          <div className="list">
            {
              this.state.groups.map(({name, address}, i) => {
                return (
                  <div
                    key={`groups-${address}`}
                    className={`list-entry ntp-groups-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                  >
                    <div title={name}>{ name }</div>
                    <div className="actions-cell">
                      <DeleteButton
                        confirm="Are you sure you want to remove this group?"
                        title={`Remove ${name}`}
                        Delete={() => this.setState({groups: this.state.groups.filter(group => group.address !== address)})}
                      />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </LabelledField>
        <br />
        <div className="form-actions">
          <LoadingElement loading={this.state.loading} loadingClassname="no-margin">
            <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
            <Action disabled={!this.state.objectId} type="submit">Create NTP Instance</Action>
          </LoadingElement>
        </div>
      </form>
    );
  }

  EditNTPInstanceForm() {
    return (
      <form
        className="ntp-instance-form ntp-instance-create-form"
        onSubmit={async event => {
          event.preventDefault();

          try {
            this.setState({loading: true, error: undefined});

            await this.props.rootStore.EditNTPInstance({
              ntpId: this.state.ntpId,
              name: this.state.name,
              maxTickets: this.state.maxTickets,
              maxRedemptions: this.state.maxRedemptions,
              start: this.state.start,
              end: this.state.end,
            });

            await this.props.onComplete(this.props.ntpId, this.state.name);
          } catch (error) {
            this.setState({error: "Failed to update NTP Instance"});
            this.props.rootStore.LogError("Failed to update NTP Instance", error);
          } finally {
            this.setState({loading: false});
          }
        }}
      >
        <h1>Edit NTP Instance</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">{ this.state.error }</div>
        <LabelledField label="Name">
          <input
            required
            value={this.state.name}
            onChange={event => this.setState({name: event.target.value, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Start Time (optional)">
          <DateSelection
            readOnly
            noLabel
            value={this.state.start}
            onChange={dateTime => this.setState({start: dateTime, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="End Time (optional)">
          <DateSelection
            readOnly
            noLabel
            value={this.state.end}
            onChange={dateTime => this.setState({end: dateTime, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Max Issuable Tickets (0 for no limit)">
          <input
            required
            type="number"
            step={1}
            value={this.state.maxTickets}
            onChange={event => this.setState({maxTickets: event.target.value, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="Max Redemptions per Ticket">
          <input
            required
            type="number"
            step={1}
            value={this.state.maxRedemptions}
            onChange={event => this.setState({maxRedemptions: event.target.value, error: undefined})}
          />
        </LabelledField>
        <br />
        <div className="form-actions">
          <LoadingElement loading={this.state.loading} loadingClassname="no-margin">
            <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
            <Action disabled={!this.state.objectId} type="submit">Update NTP Instance</Action>
          </LoadingElement>
        </div>
      </form>
    );
  }

  AddNTPInstanceForm() {
    return (
      <form
        className="ntp-instance-form"
        onSubmit={async event => {
          event.preventDefault();

          this.setState({error: undefined, loading: true});

          try {
            await this.props.onComplete(this.state.ntpId, this.state.name);
          } catch (error) {
            this.setState({error: "Invalid NTP", loading: false});

            this.props.rootStore.LogError(`Failed to load NTP Instance ${this.state.ntpId}`, error);
          }
        }}
      >
        <h1>Add Existing NTP Instance</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">{ this.state.error }</div>
        <LabelledField label="Name">
          <input
            required
            value={this.state.name}
            onChange={event => this.setState({name: event.target.value, error: undefined})}
          />
        </LabelledField>
        <LabelledField label="NTP ID">
          <input
            required
            value={this.state.ntpId}
            onChange={event => this.setState({ntpId: event.target.value, error: undefined})}
          />
        </LabelledField>

        <div className="form-actions">
          <LoadingElement loading={this.state.loading} loadingClassname="no-margin">
            <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
            <Action type="submit">Add NTP Instance</Action>
          </LoadingElement>
        </div>
      </form>
    );
  }

  IssueTicketForm() {
    if(this.state.issuedTickets) {
      let failures;
      if(this.state.issuedTickets.failures.length > 0) {
        if(this.state.useEmails) {
          failures = "Failed to issue tickets for the following emails:\n";
          this.state.issuedTickets.failures.forEach(({email}) => failures = failures + `\n${email}`);
          failures += "\n\n\n";
        } else {
          failures = `Failed to issue ${this.state.issuedTickets.failures.length} tickets\n\n\n`;
        }
      }

      let tickets;
      if(this.state.issuedTickets.tickets.length > 0) {
        tickets = "Tickets Issued:\n";

        if(this.state.useEmails) {
          this.state.issuedTickets.tickets.forEach(({token, user_id}) => tickets = tickets + `\n${user_id} - ${token}`);
        } else {
          this.state.issuedTickets.tickets.forEach(({token}) => tickets = tickets + `\n${token}`);
        }
      }

      return (
        <form className="ntp-instance-form">
          <h1>Issue Tickets For '{this.NTP().name}'</h1>

          <pre>
            { failures }
            { tickets }
          </pre>

          <div className="form-actions">
            <Action onClick={() => this.props.onComplete()}>Done</Action>
          </div>
        </form>
      );
    }

    return (
      <form
        className="ntp-instance-form ntp-ticket-form"
        onSubmit={async event => {
          event.preventDefault();

          this.setState({error: undefined, loading: true});

          try {
            const { tickets, failures } = await this.props.rootStore.IssueTickets({
              ntpId: this.props.ntpId,
              useEmails: this.state.useEmails,
              count: this.state.count,
              emails: this.state.emails,
              callback: ({completed, total}) => {
                this.setState({ticketsCompleted: completed, ticketsTotal: total});
              }
            });

            this.setState({
              issuedTickets: {
                tickets,
                failures
              }
            });
          } catch (error) {
            this.setState({error: error.message || error, loading: false});

            this.props.rootStore.LogError(`Failed to issue ticket for ${this.state.ntpId}`, error);
          }
        }}
      >
        <h1>Issue Tickets For '{this.NTP().name}'</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">{ this.state.error }</div>

        { this.state.ticketsTotal ?
          <div className="ticket-status">Issuing Tickets: {this.state.ticketsCompleted} / {this.state.ticketsTotal} </div> : null }

        <Checkbox
          label="Associate tickets with emails"
          value={this.state.useEmails}
          onChange={value => this.setState({useEmails: value})}
        />

        {
          this.state.useEmails ?
            (
              <LabelledField label="Email Addresses (comma separated)" className="align-top">
                <textarea
                  value={this.state.emails}
                  onChange={event => this.setState({emails: event.target.value, error: undefined})}
                />
              </LabelledField>
            ) :
            (
              <LabelledField label="Number of Tickets">
                <input
                  type="number"
                  step={1}
                  value={this.state.count}
                  onChange={event => this.setState({count: event.target.value, error: undefined})}
                />
              </LabelledField>
            )
        }

        <div className="form-actions">
          <LoadingElement loading={this.state.loading} loadingClassname="no-margin">
            <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
            <Action type="submit">Issue Ticket</Action>
          </LoadingElement>
        </div>
      </form>
    );
  }

  render() {
    let form;
    if(this.props.create) {
      form = this.CreateNTPInstanceForm();
    } else if(this.props.edit) {
      form = this.EditNTPInstanceForm();
    } else if(this.props.issue) {
      form = this.IssueTicketForm();
    } else {
      form = this.AddNTPInstanceForm();
    }

    return (
      <div className="ntp-browser">
        { this.state.modal }
        { form }
      </div>
    );
  }

  /* NTP Instance Browser */

  async SelectTargetObject({objectId}) {
    const { displayTitleWithStatus } = await this.props.rootStore.DisplayTitle({objectId});

    this.setState({objectId, objectDisplayTitle: displayTitleWithStatus});
    this.CloseModal();
  }

  ActivateModal(target="object") {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal ntp-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          {
            target === "object" ?
              <ContentBrowser
                header="Select an Object for this NTP Instance"
                browseSite
                onComplete={this.SelectTargetObject}
                onCancel={this.CloseModal}
              /> :
              <Groups
                selectable={true}
                onSelect={(address, _, name) => {
                  this.setState({groups: [...this.state.groups, {name, address}]});
                  this.CloseModal();
                }}
                fabricOnly
              />
          }
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

NTPForms.propTypes = {
  create: PropTypes.bool,
  edit: PropTypes.bool,
  issue: PropTypes.bool,
  ntpId: PropTypes.string,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default NTPForms;
