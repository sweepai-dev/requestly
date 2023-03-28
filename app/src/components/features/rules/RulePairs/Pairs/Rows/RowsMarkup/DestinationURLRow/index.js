import React, { useState } from "react";
import { Row, Col, Input, Tooltip, Dropdown, Radio, Popconfirm } from "antd";
import {
  FolderOpenOutlined,
  CaretDownOutlined,
  FileSyncOutlined,
  WarningFilled,
} from "@ant-design/icons";
import { HiOutlineExternalLink } from "react-icons/hi";
import isEmpty from "is-empty";
import FilePickerModal from "../../../../../../filesLibrary/FilePickerModal";
import { isValidUrl } from "utils/FormattingHelper";
import MockPickerModal from "components/features/mocksV2/MockPickerModal";
import { displayFileSelector } from "components/mode-specific/desktop/misc/FileDialogButton";
import { isFeatureCompatible } from "utils/CompatibilityUtils";
import FEATURES from "config/constants/sub/features";
import {
  trackSelectMapLocalFile,
  trackClickMapLocalFile,
  trackClickMock,
  trackSelectMock,
} from "modules/analytics/events/features/rules/redirectDestinationOptions";
import { isDesktopMode } from "utils/AppUtils";
import Logger from "lib/logger";
import "./index.css";
import { RQButton } from "lib/design-system/components";

const DestinationURLRow = ({
  rowIndex,
  pair,
  pairIndex,
  helperFunctions,
  isInputDisabled,
}) => {
  const REDIRECT_DESTINATIONS = {
    URL: "URL",
    MAP_LOCAL: "map_local",
    MOCK_PICKER: "mock_picker",
  };
  const { generatePlaceholderText, modifyPairAtGivenPath } = helperFunctions;
  //Component State
  const [isFilePickerModalActive, setIsFilePickerModalActive] = useState(false);
  const [
    destinationTypePopupVisible,
    setDestinationTypePopupVisible,
  ] = useState(false);
  const [destinationPopupSelection, setDestinationPopupSelection] = useState(
    null
  );
  /** TODO: Remove this once MocksV2 Released */
  const toggleFilePickerModal = () => {
    setIsFilePickerModalActive(!isFilePickerModalActive);
  };

  const handleFilePickerAction = (url) => {
    setIsFilePickerModalActive(false);
    modifyPairAtGivenPath(undefined, pairIndex, "destination", url);
  };
  /** TODO: Remove till here */

  const [isMockPickerVisible, setIsMockPickerVisible] = useState(false);

  const handleMockPickerVisibilityChange = (visible) => {
    // seems like an unnecessary abstraction
    setIsMockPickerVisible(visible);
  };

  const handleMockPickerSelectionCallback = (url) => {
    trackSelectMock(url);
    setIsMockPickerVisible(false);
    modifyPairAtGivenPath(undefined, pairIndex, "destination", url);
  };

  const handleFileSelectCallback = (filePath) => {
    trackSelectMapLocalFile(filePath);
    modifyPairAtGivenPath(
      undefined,
      pairIndex,
      "destination",
      `file://${filePath}`
    );
  };

  const handleInputOptionSelect = (e) => {
    switch (e.key) {
      case "mock": {
        trackClickMock();
        setIsMockPickerVisible(true);
        break;
      }
      case "local": {
        trackClickMapLocalFile();
        displayFileSelector(handleFileSelectCallback);
        break;
      }
      default: {
        Logger.error("Added menu item without click handler");
      }
    }
  };

  const inputOptions = () => {
    const items = [
      {
        label: "Pick from Mock Server",
        key: "mock",
        icon: <FolderOpenOutlined />,
      },
      {
        label: "Map Local File",
        key: "local",
        disabled: !isFeatureCompatible(FEATURES.REDIRECT_MAP_LOCAL),
        icon: <FileSyncOutlined />,
      },
    ];

    return (
      <Dropdown.Button
        menu={{ items, onClick: handleInputOptionSelect }}
        placement="bottom"
        icon={<CaretDownOutlined />}
        onClick={() => setIsMockPickerVisible(true)}
      >
        Pick from Mock Server
      </Dropdown.Button>
    );
  };

  const preValidateURL = () => {
    const currentDestinationURL = pair.destination;
    if (isEmpty(currentDestinationURL)) return;
    if (
      !isValidUrl(currentDestinationURL) &&
      !currentDestinationURL.startsWith("$")
    ) {
      // Try auto-fixing
      if (
        !currentDestinationURL.startsWith("$") &&
        !currentDestinationURL.startsWith("http://") &&
        !currentDestinationURL.startsWith("https://") &&
        !currentDestinationURL.startsWith("file://")
      ) {
        modifyPairAtGivenPath(
          {
            target: {
              value: "http://" + currentDestinationURL,
            },
          },
          pairIndex,
          "destination"
        );
      }
    }
  };

  // toggle warning for destination urls starting with `file://`
  const showInputWarning = () => {
    if (
      pair.destination &&
      pair.destination.startsWith("file://") &&
      !isFeatureCompatible(FEATURES.REDIRECT_MAP_LOCAL)
    ) {
      return true;
    }
    return false;
  };

  const handleDestinationTypeChange = () => {
    modifyPairAtGivenPath(undefined, pairIndex, "destination", "", [
      {
        path: "destinationType",
        value: destinationPopupSelection,
      },
    ]);
  };

  const renderRedirectURLInput = () => {
    return (
      <Input
        data-tour-id="rule-editor-destination-url"
        className="display-inline-block"
        placeholder={generatePlaceholderText(
          pair.source.operator,
          "destination"
        )}
        type="text"
        onChange={(event) =>
          modifyPairAtGivenPath(event, pairIndex, "destination")
        }
        onBlur={preValidateURL}
        value={pair.destination}
        disabled={isInputDisabled}
        status={showInputWarning() ? "warning" : null}
        suffix={
          showInputWarning() ? (
            <Tooltip
              title={
                isDesktopMode()
                  ? "Update to latest version to redirect to Local File"
                  : "Map Local File is not supported in Extension. Use Requestly Desktop App instead."
              }
            >
              <WarningFilled />
            </Tooltip>
          ) : null
        }
      />
    );
  };

  const renderMockOrFilePicker = () => {
    return (
      <Col span={24} className="picker-container">
        <RQButton
          className="white text-bold"
          type="default"
          onClick={() => setIsMockPickerVisible(true)}
        >
          {pair.destination ? "Change file" : " Select mock/file"}
        </RQButton>
        <span className="destination-file-path">
          {pair.destination.length
            ? pair.destination
            : " No mock or file chosen"}
        </span>
        {pair.destination && (
          <a href={pair.destination} target="_blank" rel="noreferrer">
            <HiOutlineExternalLink className="external-link-icon" />
          </a>
        )}
      </Col>
    );
  };

  const renderDestinationAction = () => {
    switch (pair.destinationType) {
      case REDIRECT_DESTINATIONS.URL:
        return renderRedirectURLInput();
      case REDIRECT_DESTINATIONS.MOCK_PICKER:
        return renderMockOrFilePicker();
      default:
        return renderRedirectURLInput();
    }
  };

  const showPopup = (e) => {
    const destinationType = e.target.value;
    setDestinationPopupSelection(destinationType);
    setDestinationTypePopupVisible(true);
  };

  return (
    <React.Fragment>
      <Row
        className="margin-top-one"
        key={rowIndex}
        span={24}
        style={{
          alignItems: "center",
        }}
      >
        <Col span={3}>
          <span className="white text-bold">Redirect to</span>
        </Col>
        <Col span={24}>
          <Row className="redirect-destination-container">
            <Col span={24} className="destination-options">
              <Popconfirm
                title="This will clear the existing changes"
                okText="Confirm"
                cancelText="Cancel"
                onConfirm={() => {
                  handleDestinationTypeChange();
                  setDestinationTypePopupVisible(false);
                }}
                onCancel={() => setDestinationTypePopupVisible(false)}
                open={destinationTypePopupVisible}
              >
                <Radio.Group value={pair.destinationType} onChange={showPopup}>
                  <Radio value={REDIRECT_DESTINATIONS.URL}>URL</Radio>
                  <Radio
                    value={REDIRECT_DESTINATIONS.MAP_LOCAL}
                    disabled={!isDesktopMode()}
                  >
                    Local file
                  </Radio>
                  <Radio value={REDIRECT_DESTINATIONS.MOCK_PICKER}>
                    Pick from Files/Mock server
                  </Radio>
                </Radio.Group>
              </Popconfirm>
            </Col>
            <Col span={24} className="destination-action">
              {renderDestinationAction()}
            </Col>
          </Row>
        </Col>
      </Row>
      {/* MODALS */}
      {/* Remove this once MocksV2 Released */}
      {isFilePickerModalActive ? (
        <FilePickerModal
          isOpen={isFilePickerModalActive}
          toggle={toggleFilePickerModal}
          callback={handleFilePickerAction}
        />
      ) : null}
      {/* Till here */}
      {isMockPickerVisible ? (
        <MockPickerModal
          isVisible={isMockPickerVisible}
          onVisibilityChange={handleMockPickerVisibilityChange}
          mockSelectionCallback={handleMockPickerSelectionCallback}
        />
      ) : null}
    </React.Fragment>
  );
};

export default DestinationURLRow;
