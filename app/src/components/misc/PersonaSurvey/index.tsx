import React, { useMemo, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getUserPersonaSurveyDetails, getAppMode } from "store/selectors";
import { actions } from "store";
import { SurveyModalFooter } from "./ModalFooter";
import { SurveyConfig, OptionsConfig } from "./config";
import { getSurveyPage, shouldShowOnboarding, shuffleOptions } from "./utils";
import { isExtensionInstalled } from "actions/ExtensionActions";
import { Option, PageConfig, QuestionnaireType, SurveyPage } from "./types";
import { SurveyOption } from "./Option";
import { RQButton, RQModal } from "lib/design-system/components";
import { trackPersonaSurveySignInClicked, trackPersonaSurveyViewed } from "modules/analytics/events/misc/personaSurvey";
import { AUTH } from "modules/analytics/events/common/constants";
import APP_CONSTANTS from "config/constants";
//@ts-ignore
import { CONSTANTS as GLOBAL_CONSTANTS } from "@requestly/requestly-core";
import "./index.css";
import { handleSurveyNavigation } from "./actions";

interface SurveyProps {
  callback?: () => void;
  isSurveyModal: boolean;
  isOpen?: boolean;
}

export const PersonaSurvey: React.FC<SurveyProps> = ({ callback, isSurveyModal, isOpen }) => {
  const dispatch = useDispatch();
  const appMode = useSelector(getAppMode);
  const userPersona = useSelector(getUserPersonaSurveyDetails);
  const currentPage = useMemo(() => getSurveyPage(userPersona.page), [userPersona.page]);

  const shuffledQ1 = useMemo(() => {
    return shuffleOptions(OptionsConfig[QuestionnaireType.PERSONA].options);
  }, []);

  const SkippableButton = useCallback(() => {
    return (
      <div className="skip-recommendation-wrapper">
        Existing user?
        <RQButton
          className="skip-recommendation-btn persona-login-btn"
          type="link"
          onClick={() => {
            trackPersonaSurveySignInClicked();
            dispatch(
              actions.toggleActiveModal({
                modalName: "authModal",
                newProps: {
                  callback: () => {
                    dispatch(actions.updateIsPersonaSurveyCompleted(true));
                  },
                  authMode: APP_CONSTANTS.AUTH.ACTION_LABELS.LOG_IN,
                  eventSource: AUTH.SOURCE.PERSONA_SURVEY,
                },
              })
            );
          }}
        >
          Sign in
        </RQButton>
      </div>
    );
  }, [dispatch]);

  const renderQuestionnaire = useCallback(
    (optionSet: QuestionnaireType) => {
      switch (optionSet) {
        case QuestionnaireType.PERSONA:
          return renderOptions(shuffledQ1, optionSet);
        default:
          return null;
      }
    },
    [shuffledQ1]
  );

  const renderOptions = (options: Option[], optionSet: QuestionnaireType) => {
    return (
      <>
        <div className="survey-options-container">
          {options.map((option: Option, index: number) => (
            <SurveyOption
              key={index}
              option={option}
              questionType={OptionsConfig[optionSet].questionType}
              isActive={OptionsConfig[optionSet].isActive}
              action={OptionsConfig[optionSet].action}
              fieldKey={OptionsConfig[optionSet].key}
            />
          ))}
        </div>
      </>
    );
  };

  const renderPage = useCallback(
    (page: PageConfig) => {
      return (
        <>
          {currentPage === SurveyPage.GETTING_STARTED && <SkippableButton />}
          <div className="text-center white text-bold survey-title">{page.title}</div>
          <div className="w-full survey-subtitle-wrapper">
            <div className="text-gray text-center mt-8">{page.subTitle}</div>
          </div>
          <>{typeof page.render === "function" ? page.render() : renderQuestionnaire(page.render)}</>
        </>
      );
    },
    [renderQuestionnaire, SkippableButton, currentPage]
  );

  useEffect(() => {
    if (
      SurveyConfig[currentPage as SurveyPage]?.skip ||
      (!isSurveyModal && currentPage === SurveyPage.GETTING_STARTED)
    ) {
      handleSurveyNavigation(currentPage, dispatch);
    }
  }, [currentPage, dispatch, isSurveyModal]);

  useEffect(() => {
    if (isSurveyModal) {
      shouldShowOnboarding(appMode).then((result) => {
        if (result) {
          if (appMode === GLOBAL_CONSTANTS.APP_MODES.DESKTOP) {
            dispatch(actions.toggleActiveModal({ modalName: "personaSurveyModal", newValue: true }));
          } else {
            if (isExtensionInstalled()) {
              const isRecommendationScreen = currentPage === SurveyPage.RECOMMENDATIONS;
              dispatch(
                actions.toggleActiveModal({ modalName: "personaSurveyModal", newValue: !isRecommendationScreen })
              );
            }
          }
        }
      });
    }
  }, [appMode, currentPage, dispatch, isSurveyModal]);

  useEffect(() => {
    if (currentPage === SurveyPage.GETTING_STARTED) {
      shouldShowOnboarding(appMode).then((result) => {
        if (result) {
          if (appMode === GLOBAL_CONSTANTS.APP_MODES.DESKTOP) {
            trackPersonaSurveyViewed();
          } else if (isExtensionInstalled()) {
            trackPersonaSurveyViewed();
          }
        }
      });
    }
  }, [appMode, currentPage]);

  useEffect(() => {
    if (userPersona?.page > 2) dispatch(actions.updateIsPersonaSurveyCompleted(true));
  }, [dispatch, userPersona?.page]);

  const renderSurveyPages = useCallback(() => {
    return (
      <>
        {currentPage !== SurveyPage.RECOMMENDATIONS ? <>{renderPage(SurveyConfig[currentPage as SurveyPage])}</> : null}
      </>
    );
  }, [renderPage, currentPage]);

  return (
    <>
      {isSurveyModal ? (
        <RQModal
          open={isOpen}
          centered
          closable={false}
          className="survey-modal"
          bodyStyle={{ width: "550px" }}
          maskStyle={{ background: "#0D0D10" }}
        >
          <div className="persona-survey-container">
            {renderSurveyPages()}
            <SurveyModalFooter isSurveyModal={isSurveyModal} currentPage={currentPage} callback={callback} />
          </div>
        </RQModal>
      ) : (
        <div className="persona-survey-container">
          {renderSurveyPages()}
          <SurveyModalFooter isSurveyModal={isSurveyModal} currentPage={currentPage} callback={callback} />
        </div>
      )}
    </>
  );
};
