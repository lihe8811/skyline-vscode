function transformUsersAndGroups(raw) {
  const roleByUid = new Map((raw.domainUsers || []).map((x) => [x.uid, x]));

  const users = (raw.users || []).map((u) => {
    const domainUser = roleByUid.get(u._id) || {};
    return {
      userId: u._id,
      username: u.uname,
      usernameLower: String(u.uname || '').toLowerCase(),
      email: u.mail,
      role: domainUser.role || 'student',
      displayName: domainUser.displayName || u.uname,
      passwordHash: null,
    };
  });

  const groups = (raw.userGroups || []).map((g) => ({
    groupId: String(g._id),
    name: g.name,
    domainId: g.domainId,
  }));

  const groupMembers = [];
  for (const g of raw.userGroups || []) {
    for (const uid of g.uids || []) {
      groupMembers.push({ groupId: String(g._id), userId: uid });
    }
  }

  return { users, groups, groupMembers };
}

module.exports = { transformUsersAndGroups };
