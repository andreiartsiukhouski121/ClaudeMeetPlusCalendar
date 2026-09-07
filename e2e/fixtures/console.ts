import type { Page } from '@playwright/test';

/**
 * Next.js в dev-режиме ругается в консоль на свой HMR-сокет, когда тот не поднялся
 * (например, dev-сервер запущен на нестандартном порту — а Playwright работает именно
 * на 3100). Это шум инфраструктуры, а не ошибка приложения — иначе тест флакает
 * в зависимости от состояния dev-сервера.
 *
 * Паттерны перенесены из удалённого `e2e/web/home.spec.ts`, где они были проверены прогонами.
 * Не переписывать «с нуля»: без фильтра кейсы AL-FN-08 и HD-FN-10 становятся флакающими.
 */
const DEV_SERVER_NOISE = [/\/_next\/hmr/, /WebSocket connection to/];

export function isDevServerNoise(text: string): boolean {
  return DEV_SERVER_NOISE.some((pattern) => pattern.test(text));
}

/**
 * Подписывается на `console` и `pageerror` и возвращает массив, который наполняется
 * по мере работы страницы. Подписаться нужно ДО `page.goto`, иначе ошибки первого
 * рендера в массив не попадут.
 *
 * Возвращается ссылка на живой массив, а не снимок: ассерт вида `expect(problems).toEqual([])`
 * ставится в конце теста и видит всё, что накопилось. Строки префиксуются источником —
 * при падении отчёт сразу говорит, была это ошибка консоли или необработанное исключение.
 *
 * Собираются только `console.error` (не `warning`): предупреждения React о ключах и подобное
 * — не поломка поведения, а делать блокером любое из них значит превратить кейс в шумный.
 */
export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && !isDevServerNoise(message.text())) {
      problems.push(`console.error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  return problems;
}
