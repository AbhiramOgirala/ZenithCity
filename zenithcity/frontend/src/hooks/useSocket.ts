import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSocket, disconnectSocket } from '../services/socket';
import { updateCityFromSocket } from '../store/slices/citySlice';
import { addToast } from '../store/slices/uiSlice';
import { RootState } from '../store';

export function useSocket() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!token || !user) return;
    const socket = connectSocket(user.id);

    socket.on('city:building_complete', (data: any) => {
      dispatch(addToast({ type: 'success', message: `🏗️ ${data.building_type} complete!` }));
      dispatch(updateCityFromSocket(data.city));
    });
    socket.on('city:decline_warning', () => {
      dispatch(addToast({ type: 'warning', message: '⚠️ City declining! Work out now.' }));
    });
    socket.on('leaderboard:rank_change', (data: any) => {
      dispatch(addToast({ type: 'info', message: `📊 Rank changed to #${data.new_rank}!` }));
    });
    socket.on('battle:rank_update', (data: any) => {
      dispatch(addToast({ type: 'info', message: `⚔️ Battle rank: #${data.rank}` }));
    });

    return () => { disconnectSocket(); };
  }, [token, user?.id]);
}
