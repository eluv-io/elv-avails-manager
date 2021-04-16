import React from "react";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";
import PropTypes from "prop-types";
import {Action, LabelledField, Modal} from "elv-components-js";
import {BackButton, DeleteButton, FormatDate, InitPSF} from "./Misc";
import Path from "path";

@inject("rootStore")
@observer
class NTPSubjects extends React.Component {
  constructor(props) {
    super(props);

    this.AddNTPSubject = this.AddNTPSubject.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);

    this.InitPSF = InitPSF.bind(this);
    this.InitPSF({
      sortKey: "name",
      additionalState: {
        modal: null
      }
    });
  }

  NTP() {
    return this.props.rootStore.allNTPInstances[this.props.ntpId || this.props.match.params.ntpId];
  }

  NTPSubjects() {
    return this.props.rootStore.allNTPSubjects[this.props.ntpId || this.props.match.params.ntpId];
  }

  render() {
    const ntpInstance = this.NTP();
    const ntpSubjects = Object.values(this.NTPSubjects())
      .filter(({ntpId, name}) => !this.state.activeFilter ||
        (name || "").toLowerCase().includes(this.state.activeFilter.toLowerCase()) ||
        (ntpId || "").toLowerCase().includes(this.state.activeFilter.toLowerCase())
      )
      .sort((a, b) => a[this.state.sortKey] < b[this.state.sortKey] ? (this.state.sortAsc ? -1 : 1) : (this.state.sortAsc ? 1 : -1));

    return (
      <div className="page-container ntp-subjects-page">
        { this.state.modal }
        <div className="page-header">
          <h1>
            { this.props.selectable ? null : <BackButton to={Path.dirname(this.props.location.pathname)} /> }
            {ntpInstance.name || ntpInstance.ntpId} | NTP Subjects
          </h1>
        </div>

        <div className="controls">
          { this.props.rootStore.tenantId ? <Action onClick={() => this.ActivateModal(false)}>Add NTP Subject</Action> : null }
          { this.Filter("Filter NTP Subjects...") }
        </div>
        { this.PageControls(Object.values(this.NTPSubjects()).length) }
        <div className="list">
          <div className={`list-entry list-header ntp-subject-list-entry ${this.props.selectable ? "list-entry-selectable" : ""}`}>
            { this.SortableHeader("name", "Subject") }
            { this.SortableHeader("startTime", "Start Time") }
            { this.SortableHeader("endTime", "End Time") }
            <div>Titles</div>
            { this.props.selectable ? null : <div /> }
          </div>
          {
            this.Paged(ntpSubjects).map(({address, name, startTime, endTime}, i) => {
              const dateFormat = {year: "numeric", month: "numeric", day: "numeric"};
              const contents = (
                <React.Fragment>
                  <div title={name}>{name}</div>
                  <div title={FormatDate(startTime)}>{ FormatDate(startTime, false, dateFormat) }</div>
                  <div title={FormatDate(endTime)}>{ FormatDate(endTime, false, dateFormat) }</div>
                  <div>{ this.props.rootStore.targetTitleIds(address).length }</div>
                </React.Fragment>
              );

              if(this.props.selectable) {
                return (
                  <div
                    key={`ntp-subjects-${name}`}
                    className={`list-entry list-entry-selectable ntp-subject-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                    onClick={() => this.props.onSelect(address, "ntpSubject", name)}
                  >
                    { contents }
                  </div>
                );
              }

              return (
                <Link
                  to={UrlJoin("/ntps", this.props.ntpId || this.props.match.params.ntpId, "subjects", name)}
                  key={`ntp-subjects-${name}`}
                  className={`list-entry ntp-subject-list-entry ${i % 2 === 0 ? "even" : "odd"}`}
                >
                  { contents }
                  <div className="actions-cell">
                    <DeleteButton
                      confirm="Are you sure you want to remove this subject?"
                      title={`Remove ${name}`}
                      Delete={() => this.props.rootStore.RemoveTarget(address, this.props.ntpId || this.props.match.params.ntpId)}
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

  NTPSubjectForm() {
    return (
      <form className="fabric-user-form" onSubmit={() => this.AddNTPSubject()}>
        <h1>Add NTP Subject</h1>
        <div key={`error-${this.state.error}-${Math.random()}`} className="message error-message">
          { this.state.error ? this.state.error : undefined }
        </div>
        <LabelledField label="Subject ID">
          <input
            required
            value={this.state.name}
            onChange={event => this.setState({name: event.target.value, error: undefined})}
          />
        </LabelledField>
        <div className="form-actions">
          <Action className="secondary" onClick={this.CloseModal}>Cancel</Action>
          <Action type="submit">Add NTP Subject</Action>
        </div>
      </form>
    );
  }

  async AddNTPSubject() {
    await this.props.rootStore.LoadNTPSubject({
      subjectId: this.state.name,
      ntpId: this.props.ntpId || this.props.match.params.ntpId
    });

    this.setState({name: ""});

    this.CloseModal();
  }

  ActivateModal(create=false) {
    this.setState({
      modal: (
        <Modal
          closable
          OnClickOutside={this.CloseModal}
          className={`asset-form-modal ${create ? "fullscreen-modal" : "shrink-modal"}`}
        >
          { this.NTPSubjectForm() }
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

NTPSubjects.propTypes = {
  selectable: PropTypes.bool,
  onSelect: PropTypes.func
};

export default NTPSubjects;
