const test = require('node:test');
const assert = require('node:assert/strict');

const { transformUsersAndGroups } = require('../etl/users_groups');

test('transformUsersAndGroups merges users with domain roles and expands group members', () => {
  const raw = {
    users: [
      { _id: 2, uname: 'alice', mail: 'a@example.com' },
      { _id: 3, uname: 'bob', mail: 'b@example.com' },
    ],
    domainUsers: [
      { uid: 2, role: 'teacher', displayName: 'Alice' },
      { uid: 3, role: 'student', displayName: 'Bob' },
    ],
    userGroups: [
      { _id: 'g1', name: 'Class A', domainId: 'system', uids: [2, 3] },
    ],
  };

  const out = transformUsersAndGroups(raw);

  assert.equal(out.users.length, 2);
  assert.deepEqual(out.users.find((x) => x.userId === 2), {
    userId: 2,
    username: 'alice',
    email: 'a@example.com',
    role: 'teacher',
    displayName: 'Alice',
  });

  assert.equal(out.groups.length, 1);
  assert.deepEqual(out.groups[0], {
    groupId: 'g1',
    name: 'Class A',
    domainId: 'system',
  });

  assert.deepEqual(out.groupMembers, [
    { groupId: 'g1', userId: 2 },
    { groupId: 'g1', userId: 3 },
  ]);
});
