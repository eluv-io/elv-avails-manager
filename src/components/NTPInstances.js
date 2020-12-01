import React from "react";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Redirect} from "react-router";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import {Action, Modal} from "elv-components-js";
import {DeleteButton, FormatDate, InitPSF, NTPBadge} from "./Misc";

import NTPForms from "./NTPForms";


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
        { this.PageControls(Object.values(this.props.rootStore.allNTPInstances).length) }
        <div className="list">
          <div className={`list-entry list-header ntp-instance-list-entry ${this.props.selectable ? "list-entry-selectable" : ""}`}>
            { this.SortableHeader("name", "Name") }
            { this.SortableHeader("id", "ID") }
            { this.SortableHeader("startTime", "Start Time") }
            { this.SortableHeader("endTime", "End Time") }
            <div>Titles</div>
            { this.props.selectable ? null : <div /> }
          </div>
          {
            this.Paged(ntpInstances).map(({ntpId, name, startTime, endTime}, i) => {
              const dateFormat = {year: "numeric", month: "numeric", day: "numeric"};
              const contents = (
                <React.Fragment>
                  <div title={name}>{ name } { NTPBadge({startTime, endTime}) }</div>
                  <div title={ntpId}>{ ntpId }</div>
                  <div title={FormatDate(startTime)}>{ FormatDate(startTime, false, dateFormat) }</div>
                  <div title={FormatDate(endTime)}>{ FormatDate(endTime, false, dateFormat) }</div>
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
    await this.props.rootStore.LoadNTPInstance({ntpId, name});

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
          closable
          OnClickOutside={this.CloseModal}
          className={`asset-form-modal ${create ? "fullscreen-modal" : "shrink-modal"}`}
        >
          <NTPForms
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
