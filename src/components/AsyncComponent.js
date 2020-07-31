import "elv-components-js/src/stylesheets/async-component.scss";

import React from "react";
import PropTypes from "prop-types";
import {BallSpin, ErrorHandler} from "elv-components-js";
import {observer} from "mobx-react";

@observer
class AsyncComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true
    };
  }

  async componentDidMount() {
    this.mounted = true;

    // Wait a bit to avoid react mount-unmount bounce
    await new Promise(resolve => setTimeout(resolve, 50));
    if(!this.mounted) {
      return;
    }

    this.setState({
      loading: true
    });

    try {
      await this.props.Load();

      if(this.mounted) {
        this.setState({
          loading: false
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      this.setState({error});
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    if(this.state.error) {
      // Throw error synchronously for ErrorHandler to catch
      throw this.state.error;
    }

    if(this.state.loading) {
      return (
        <div className="-elv-async-component -elv-async-component-loading">
          <BallSpin />
        </div>
      );
    }

    return this.props.render ? this.props.render() : this.props.children;
  }
}

AsyncComponent.propTypes = {
  Load: PropTypes.func.isRequired,
  render: PropTypes.func,
  children: PropTypes.node
};

export default ErrorHandler(AsyncComponent);
