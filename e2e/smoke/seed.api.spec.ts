import { expect, test } from '@playwright/test';

import { loginApi } from '../fixtures/auth.api.js';
import { SEED_USERS, SEED_USER_KEYS } from '../fixtures/seed.js';

/**
 * Смоук сида: половина сьюта опирается на конкретных пользователей, поэтому их отсутствие
 * должно падать здесь, отдельным понятным кейсом, а не пятнадцатью красными кейсами фичи.
 *
 * Кейсы — в парном `seed.api.cases.md`. Проверка сид-встреч добавится в этот же файл в T2.4,
 * вместе с контроллером `/meetings`: раньше она была бы заведомо красной, а красный тест
 * в коммите — блокер (тест-план §6.3).
 */
test.describe('Смоук: сид на месте', { tag: '@smoke' }, () => {
  test('SM-API-02 — сид-пользователи на месте', { tag: '@p0' }, async ({ request }) => {
    for (const key of SEED_USER_KEYS) {
      const { email } = SEED_USERS[key];

      // loginApi сам ожидает 200 и внятно сообщает, что виноват сид, а не кейс.
      const token = await loginApi(request, key);

      expect(
        token.split('.'),
        `Сид-пользователь ${key} (${email}) залогинился, но accessToken не похож на JWT. ` +
          'Это проблема сида или подписи токена, а не проверяемой фичи: сверь ' +
          'apps/api/src/users/users.seed.ts с e2e/fixtures/seed.ts.',
      ).toHaveLength(3);
    }
  });
});
