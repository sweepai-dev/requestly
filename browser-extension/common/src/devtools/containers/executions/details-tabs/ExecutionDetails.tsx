import React from "react";
import { ExecutionEvent } from "../../../types";
import PropertyRow from "../../../components/PropertyRow/PropertyRow";
import "./executionDetails.scss";
import config from "../../../../config";

interface Props {
  execution: ExecutionEvent;
}

const ExecutionDetails: React.FC<Props> = ({ execution }) => {
  return (
    <div className="execution-details">
      <PropertyRow name="Request URL" value={execution.requestURL} />
      <PropertyRow
        name="Rule applied"
        value={
          <a target="_blank" href={`${config.WEB_URL}/rules/editor/edit/${execution.rule.id}`}>
            {execution.rule.name}
          </a>
        }
      />
      <PropertyRow name="Modification" value={execution.modification} />
    </div>
  );
};

export default ExecutionDetails;
