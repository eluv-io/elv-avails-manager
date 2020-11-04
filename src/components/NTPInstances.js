import React from "react";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Redirect} from "react-router";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import {Action, DateSelection, LabelledField, LoadingElement, Modal} from "elv-components-js";

import {DeleteButton, InitPSF} from "./Misc";
import ContentBrowser from "./ContentBrowser";
import Groups from "./Groups";

@inject("rootStore")
@observer
class NTPBrowser extends React.Component {
  constructor(props) {
    super(props);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({
      sortKey: "name",
      additionalState: {
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
      }
    });

    this.ActivateModal = this.ActivateModal.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
  }

  CreateNTPInstanceForm() {
    return (
      <form
        className="ntp-instance-form"
        onSubmit={async event => {
          event.preventDefault();

          try {
            this.setState({loading: true, error: ""});

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

            this.props.onComplete(ntpId, this.state.name);
          } catch (error) {
            this.setState({error: "Failed to create NTP Instance"});
            // eslint-disable-next-line no-console
            console.error(error);
          } finally {
            this.setState({loading: false});
          }
        }}
      >
        <h1>Create New NTP Instance</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">{ this.state.error } </div>
        <LabelledField label="Name">
          <input
            required
            value={this.state.name}
            onChange={event => this.setState({name: event.target.value, error: ""})}
          />
        </LabelledField>
        <LabelledField label="Start Time (optional)">
          <DateSelection
            readOnly
            noLabel
            value={this.state.start}
            onChange={dateTime => this.setState({start: dateTime})}
          />
        </LabelledField>
        <LabelledField label="End Time (optional)">
          <DateSelection
            readOnly
            noLabel
            value={this.state.end}
            onChange={dateTime => this.setState({end: dateTime})}
          />
        </LabelledField>
        <LabelledField label="Ticket Length">
          <input
            type="number"
            step={1}
            required
            value={this.state.ticketLength}
            onChange={event => this.setState({ticketLength: event.target.value, error: ""})}
          />
        </LabelledField>
        <LabelledField label="Max Issuable Tickets (0 for no limit)">
          <input
            required
            type="number"
            step={1}
            value={this.state.maxTickets}
            onChange={event => this.setState({maxTickets: event.target.value, error: ""})}
          />
        </LabelledField>
        <LabelledField label="Max Redemptions per Ticket">
          <input
            required
            type="number"
            step={1}
            value={this.state.maxRedemptions}
            onChange={event => this.setState({maxRedemptions: event.target.value, error: ""})}
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

  AddNTPInstanceForm() {
    return (
      <form
        className="ntp-instance-form"
        onSubmit={async event => {
          event.preventDefault();

          this.setState({validating: true});

          this.props.onComplete(this.state.ntpId, this.state.name);
        }}
      >
        <h1>Add Existing NTP Instance</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">{ this.state.error } </div>
        <LabelledField label="Name">
          <input
            required
            value={this.state.name}
            onChange={event => this.setState({name: event.target.value, error: ""})}
          />
        </LabelledField>
        <LabelledField label="NTP ID">
          <input
            required
            value={this.state.ntpId}
            onChange={event => this.setState({ntpId: event.target.value, error: ""})}
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
            this.AddNTPInstanceForm()
        }
      </div>
    );
  }

  /* NTP Instance Browser */

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
                onComplete={async ({objectId}) => {
                  const objectDisplayTitle = await this.props.rootStore.DisplayTitle({objectId});

                  this.setState({objectId, objectDisplayTitle});
                  this.CloseModal();
                }}
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

NTPBrowser.propTypes = {
  create: PropTypes.bool.isRequired,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};


@inject("rootStore")
@observer
class NTPInstances extends React.Component {
  constructor(props) {
    super(props);

    this.AddNTPInstance = this.AddNTPInstance.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({sortKey: "name", additionalState: { modal: null }});
  }

  render() {
    const ntpInstances = Object.values(this.props.rootStore.allNTPInstances)
      .filter(({ntpId, name}) => !this.state.activeFilter ||
        (name || "").toLowerCase().includes(this.state.activeFilter.toLowerCase()) ||
        (ntpId || "").toLowerCase().includes(this.state.activeFilter.toLowerCase())
      )
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1));

    return (
      <div className="page-container ntp-instances-page">
        { this.state.modal }
        <div className="page-header">
          <h1>NTP Instances</h1>
          <div />
        </div>

        <div className="controls">
          { this.props.rootStore.tenantId ? <Action onClick={() => this.ActivateModal(false)}>Add NTP Instance</Action> : null }
          { this.props.rootStore.tenantId ? <Action onClick={() => this.ActivateModal(true)}>Create NTP Instance</Action> : null }
          { this.Filter("Filter NTP Instances...") }
        </div>
        { this.PageControls(ntpInstances.length) }
        <div className="list">
          <div className={`list-entry list-header ntp-instance-list-entry ${this.props.selectable ? "list-entry-selectable" : ""}`}>
            { this.SortableHeader("name", "Name") }
            { this.SortableHeader("id", "ID") }
            <div>Titles</div>
            { this.props.selectable ? null : <div /> }
          </div>
          {
            this.Paged(ntpInstances).map(({ntpId, name}, i) => {
              const contents = (
                <React.Fragment>
                  <div title={name}>{ name }</div>
                  <div title={ntpId}>{ ntpId }</div>
                  <div>{ this.props.rootStore.targetTitleIds(ntpId).length }</div>
                </React.Fragment>
              );

              if(this.props.selectable) {
                return (
                  <div
                    key={`ntp-instances-${ntpId}`}
                    className={`list-entry list-entry-selectable ntp-instance-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                    onClick={() => this.props.onSelect(ntpId, name)}
                  >
                    { contents }
                  </div>
                );
              }

              return (
                <Link
                  to={UrlJoin("ntps", ntpId)}
                  key={`ntp-instances-${ntpId}`}
                  className={`list-entry ntp-instance-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                >
                  { contents }
                  <div className="actions-cell">
                    <DeleteButton
                      confirm="Are you sure you want to remove this NTP Instance?"
                      title={`Remove ${name}`}
                      Delete={() => this.props.rootStore.RemoveTarget(ntpId)}
                    />
                  </div>
                </Link>
              );
            })
          }
        </div>
      </div>
    );
  }

  /* NTP Instance Browser */

  async AddNTPInstance(ntpId, name) {
    await this.props.rootStore.AddNTPInstance({ntpId, name});

    this.CloseModal();

    if(this.props.onSelect) {
      this.props.onSelect(ntpId, "ntpInstance", name);
    } else {
      this.setState({
        modal: <Redirect to={UrlJoin(this.props.location.pathname, ntpId)}/>
      });
    }
  }

  ActivateModal(create=false) {
    this.setState({
      modal: (
        <Modal
          className={`asset-form-modal ${create ? "fullscreen-modal" : "shrink-modal"}`}
        >
          <NTPBrowser
            create={create}
            onComplete={this.AddNTPInstance}
            onCancel={this.CloseModal}
          />
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

NTPInstances.propTypes = {
  selectable: PropTypes.bool,
  onSelect: PropTypes.func
};

export default NTPInstances;
