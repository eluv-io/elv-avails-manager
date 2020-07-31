import React from "react";
import {Action, Modal} from "elv-components-js";
import ContentBrowser from "./ContentBrowser";
import {inject, observer} from "mobx-react";
import UrlJoin from "url-join";
import {Link} from "react-router-dom";

@inject("rootStore")
@observer
class Titles extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modal: null,
      previews: {}
    };

    this.AddTitle = this.AddTitle.bind(this);
    this.CloseModal = this.CloseModal.bind(this);
    this.ActivateModal = this.ActivateModal.bind(this);
  }

  TitleList() {
    return (
      <div className="list titles-list">
        <div className="list-entry titles-list-entry list-header titles-list-header">
          <div>Title</div>
          <div>Group Permissions</div>
          <div>User Permissions</div>
        </div>

        {
          this.props.rootStore.titles.map((title, index) =>
            <Link
              key={`title-entry-${title.objectId}`}
              to={UrlJoin(this.props.location.pathname, title.objectId)}
              className={`list-entry titles-list-entry ${index % 2 === 0 ? "even" : "odd"}`}
            >
              <div>{ title.title }</div>
              <div>0</div>
              <div>0</div>
            </Link>
          )
        }
      </div>
    );
  }

  render() {
    return (
      <div className="list-container titles">
        { this.state.modal }
        <header>
          <h1>All Titles</h1>
        </header>

        <Action onClick={this.ActivateModal}>Add Title</Action>

        { this.TitleList() }
      </div>
    );
  }


  /* Content Browser */

  AddTitle(args) {
    this.props.rootStore.AddTitle(args);
    this.CloseModal();
  }

  ActivateModal() {
    this.setState({
      modal: (
        <Modal
          className="asset-form-modal"
          closable={true}
          OnClickOutside={this.CloseModal}
        >
          <ContentBrowser
            header="Select a Title"
            onComplete={this.AddTitle}
            onCancel={this.CloseModal}
            objectOnly
          />
        </Modal>
      )
    });
  }

  CloseModal() {
    this.setState({modal: null});
  }
}

export default Titles;
