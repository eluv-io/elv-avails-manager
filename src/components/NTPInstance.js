import React from "react";
import {inject, observer} from "mobx-react";
import {Redirect} from "react-router";
import {Action, Confirm, LabelledField, Maybe, Modal, Tabs} from "elv-components-js";
import {BackButton, FormatDate, InitPSF, NTPBadge} from "./Misc";

import NTPForms from "./NTPForms";
import Path from "path";

@inject("rootStore")
@observer
class NTPInstance extends React.Component {
  constructor(props) {
    super(props);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({
      perPage: 20,
      sortKey: "issued_at",
      additionalState: {
        modal: null,
        tab: "details",
        tabs: [["Details", "details"], ["Tickets", "tickets"]]
      }
    });

    this.ActivateModal = this.ActivateModal.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
  }

  NTP() {
    return this.props.rootStore.allNTPInstances[this.props.match.params.ntpId];
  }

  NTPDetails() {
    const ntp = this.NTP();

    return (
      <div className="title-view">
        <LabelledField label="Name" value={ntp.name} />
        <LabelledField label="NTP ID" value={ntp.ntpId} />
        <LabelledField label="Object ID" value={ntp.objectId} />
        <LabelledField label="Last Updated" value={FormatDate(ntp.updatedAt, true)} />
        <LabelledField label="Start Time" value={FormatDate(ntp.startTime, true)} />
        <LabelledField label="End Time" value={FormatDate(ntp.endTime, true)} />
        <LabelledField label="Tickets Issued" value={ntp.issuedTickets} />
        <LabelledField label="Maximum Tickets" value={ntp.maxTickets} />
        <LabelledField label="Maximum Redemptions Per Ticket" value={ntp.maxRedemptions} />
        <LabelledField label="Ticket Character Length" value={ntp.ticketLength} />
      </div>
    );
  }

  TicketList() {
    const tickets = Object.values(this.NTP().tickets || [])
      .filter(({token, user_id}) => !this.state.activeFilter ||
        (token || "").toLowerCase().includes(this.state.activeFilter.toLowerCase()) ||
        (user_id || "").toLowerCase().includes(this.state.activeFilter.toLowerCase())
      )
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1));

    return (
      <React.Fragment>
        { this.PageControls((this.NTP().tickets || []).length) }
        <div className="list">
          <div className="list-entry list-header ntp-tickets-list-entry">
            { this.SortableHeader("token", "Ticket") }
            { this.SortableHeader("user_id", "Subject ID") }
            { this.SortableHeader("issued_at", "Issued") }
          </div>
          {
            this.Paged(tickets).map(({token, user_id, issued_at}, i) => {
              return (
                <div
                  key={`ntp-tickets-${token}`}
                  className={`list-entry ntp-tickets-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                >
                  <div title={token}>{ token }</div>
                  <div title={user_id}>{ user_id }</div>
                  <div title={FormatDate(issued_at)}>{ FormatDate(issued_at) }</div>
                </div>
              );
            })
          }
        </div>
      </React.Fragment>
    );
  }

  render() {
    if(this.state.deleted) {
      return <Redirect to={Path.dirname(this.props.location.pathname)} />;
    }

    const canIssueTickets = !this.NTP().maxTickets || this.NTP().maxTickets > this.NTP().issuedTickets;

    return (
      <div className="page-container ntp-instance">
        { this.state.modal }
        <div className="page-header">
          <BackButton to={Path.dirname(this.props.location.pathname)} />
          <h1>NTP Instance | {this.NTP().name} { NTPBadge(this.NTP()) }</h1>
        </div>

        <div className="controls">
          <Action onClick={() => this.ActivateModal()}>Update NTP Instance</Action>
          <Action
            onClick={() => this.ActivateModal(true)}
            title={canIssueTickets ? "" : "Maximum number of tickets already issued"}
            className={canIssueTickets ? "" : "secondary"}
            disabled={!canIssueTickets}
          >
            Issue Tickets
          </Action>
          <Action
            onClick={
              () => Confirm({
                message: "Are you sure you want to permanently delete this NTP instance? This action cannot be undone.",
                onConfirm: async () => {
                  await this.props.rootStore.DeleteNTPInstance({ntpId: this.props.match.params.ntpId});
                  this.props.rootStore.RemoveTarget(this.props.match.params.ntpId);
                  this.setState({deleted: true});
                }
              })
            }
            className="danger"
          >
            Delete NTP Instance
          </Action>

          {
            Maybe(
              this.state.tab === "tickets",
              this.Filter("Filter Tickets...")
            )
          }
        </div>

        <Tabs
          selected={this.state.tab}
          onChange={tab => this.setState({tab})}
          options={this.state.tabs}
        />

        { this.state.tab === "tickets" ?
          this.TicketList() :
          this.NTPDetails()
        }
      </div>
    );
  }

  ActivateModal(ticketForm=false) {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <NTPForms
            edit={!ticketForm}
            issue={ticketForm}
            ntpId={this.props.match.params.ntpId}
            onComplete={this.CloseModal}
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

export default NTPInstance;
