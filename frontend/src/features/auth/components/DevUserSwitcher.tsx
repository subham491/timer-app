import { useEffect, useState } from 'react';

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/slices/auth/authSelectors';
import { devLoginAs, fetchDevUsers, type DevUser } from '@/features/auth/api/auth.api';

const DevUserSwitcher = () => {
  const currentUser = useAppSelector(selectAuthUser);
  const [users, setUsers] = useState<DevUser[]>([]);

  useEffect(() => {
    let active = true;
    fetchDevUsers()
      .then((list) => { if (active) setUsers(list); })
      .catch(() => { /* endpoint disabled (prod) or unreachable — stay hidden */ });
    return () => { active = false; };
  }, []);

  if (users.length === 0) return null;

  const currentId = currentUser ? Number(currentUser.id) : '';

  return (
    <FormControl size="small" sx={{ minWidth: 210 }}>
      <InputLabel id="dev-user-switch-label">Dev: login as</InputLabel>
      <Select
        labelId="dev-user-switch-label"
        label="Dev: login as"
        value={currentId}
        onChange={(e) => devLoginAs(Number(e.target.value))}
      >
        {users.map((u) => (
          <MenuItem key={u.user_id} value={u.user_id}>
            {u.display_name} · {u.role}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default DevUserSwitcher;