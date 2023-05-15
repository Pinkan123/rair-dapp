import React, { useCallback, useEffect, useState } from 'react';
import Moment from 'react-moment';

import { rFetch } from '../../../../utils/rFetch';
import { TooltipBox } from '../../../common/Tooltip/TooltipBox';

import { reactSwal } from './../../../../utils/reactSwal';

import './AnalyticsPopUp.css';

interface IAnalyticsPopUp {
  watchCounter: number | null;
  videoId: string;
}

const AnalyticsPopUp: React.FC<IAnalyticsPopUp> = ({
  watchCounter,
  videoId
}) => {
  const CounterDisplay = (num: number | null | undefined) => {
    if (typeof num === 'number') {
      if (num >= 1000000) {
        const str = new Intl.NumberFormat('de-DE').format(num);
        const newNum = str.toString().split('.')[0];

        return newNum + 'M';
      } else if (num >= 100000 && num <= 999999) {
        const str = num.toString().substr(0, 3);

        return str + 'K';
      } else {
        return num;
      }
    } else {
      return <>...</>;
    }
  };

  return (
    <>
      <TooltipBox title="Views">
        <button
          onClick={() => {
            reactSwal.fire({
              html: <PopUpContainer videoId={videoId} />,
              showConfirmButton: false,
              width: '70vw',
              customClass: {
                popup: `bg-analytics`
              },
              showCloseButton: true
            });
          }}
          title="Click to the watch analytics page."
          className="btn-video-views">
          {CounterDisplay(watchCounter)}
        </button>
      </TooltipBox>
    </>
  );
};

const PopUpContainer = (videoId) => {
  const [analyticsVideo, setAnalyticsVideo] = useState<any>(null);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [uniqueAddresses, setUniqueAddresses] = useState<number>(0);

  const getCounterVideo = useCallback(async () => {
    if (videoId) {
      try {
        const req = await rFetch(`/api/analytics/${videoId.videoId}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        setAnalyticsVideo(req.results);
        setTotalCount(req.totalCount);
        setUniqueAddresses(req.uniqueAddresses.length);
      } catch (e) {
        console.info(e);
      }
    }
  }, [videoId]);

  useEffect(() => {
    getCounterVideo();
  }, [getCounterVideo]);

  return (
    <div className="video-analytics-pop-up-box">
      <div className="video-video-analytics-container">
        <div className="block-detailed-info-video">
          <div className="box-uniqinfo-statistics first">
            <p>Statistics</p>
          </div>
          <div className="container-numbers-video">
            <div className="box-uniqinfo-statistics">
              <p>Unlocks:</p>
              <>{totalCount && totalCount}</>
            </div>
            <div className="box-uniqinfo-statistics">
              <p>Unique Wallets:</p>
              <>{uniqueAddresses}</>
            </div>
            <div className="box-uniqinfo-statistics">
              <p>Watched Wallets:</p>
              <>...</>
            </div>
          </div>
        </div>
        <div className="wrapper-table-statistics">
          <div className="custom-table-statistics">
            <div className="box-collapse-info">
              <div>Timestamp</div>
              <div>Address</div>
            </div>

            {analyticsVideo && analyticsVideo.length > 0 ? (
              analyticsVideo.map((el) => {
                return (
                  <div key={el.createdAt} className="box-collapse-info">
                    <div>
                      <Moment format="DD/MM/YY HH:mm A" date={el.createdAt} />
                    </div>
                    <div>{el.userAddress}</div>
                  </div>
                );
              })
            ) : (
              <div className="box-collapse-info">
                <div>No information</div>
                <div>No information</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPopUp;
