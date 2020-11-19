import React from "react";
import {inject, observer} from "mobx-react";
import {DeleteButton, InitPSF} from "./Misc";
import {Action, DateSelection, LabelledField, LoadingElement, Modal} from "elv-components-js";
import ContentBrowser from "./ContentBrowser";
import Groups from "./Groups";
import PropTypes from "prop-types";

@inject("rootStore")
@observer
class NTPForm extends React.Component {
  constructor(props) {
    super(props);

    let additionalState = {
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
            // eslint-disable-next-line no-console
            console.error(error);
          } finally {
            this.setState({loading: false});
          }
        }}
      >
        <legend>Create New NTP Instance</legend>
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
        <LoadingElement loading={this.state.loading} loadingClassname="no-margin">
          <div className="form-actions">
            <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
            <Action disabled={!this.state.objectId} type="submit">Create NTP Instance</Action>
          </div>
        </LoadingElement>
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
            this.setState({error: "Failed to create NTP Instance"});
            // eslint-disable-next-line no-console
            console.error(error);
          } finally {
            this.setState({loading: false});
          }
        }}
      >
        <legend>Edit NTP Instance</legend>
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
        <LoadingElement loading={this.state.loading} loadingClassname="no-margin">
          <div className="form-actions">
            <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
            <Action disabled={!this.state.objectId} type="submit">Update NTP Instance</Action>
          </div>
        </LoadingElement>
      </form>
    );
  }

  AddNTPInstanceForm() {
    return (
      <form
        className="ntp-instance-form"
        onSubmit={async event => {
          event.preventDefault();

          this.setState({error: undefined, validating: true});

          try {
            await this.props.onComplete(this.state.ntpId, this.state.name);
          } catch (error) {
            this.setState({error: "Invalid NTP"});

            // eslint-disable-next-line no-console
            console.error(`Failed to load NTP ${this.state.ntpId}:`);
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }}
      >
        <legend>Add Existing NTP Instance</legend>
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
          <Action className="secondary" onClick={this.props.onCancel}>Cancel</Action>
          <Action type="submit">Add NTP Instance</Action>
        </div>
      </form>
    );
  }

  render() {
    return (
      <div className="ntp-browser">
        { this.state.modal }
        {
          this.props.create ?
            this.CreateNTPInstanceForm() :
            this.props.edit && this.props.ntpId ?
              this.EditNTPInstanceForm():
              this.AddNTPInstanceForm()
        }
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

NTPForm.propTypes = {
  create: PropTypes.bool,
  edit: PropTypes.bool,
  ntpId: PropTypes.string,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default NTPForm;
