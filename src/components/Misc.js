import React from "react";
import BackIcon from "../static/icons/directory_back.svg";
import {IconButton} from "elv-components-js";
import {Link} from "react-router-dom";

export const BackButton = ({to}) => (
  <Link to={to} className="back-button">
    <IconButton
      icon={BackIcon}
      label={"Back"}
    />
  </Link>
);

