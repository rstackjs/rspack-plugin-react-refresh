import { performReactRefresh } from 'react-refresh/runtime';
import { rs } from 'rstack/test';
import { enqueueUpdate } from '../client/refreshUtils.js';

rs.mock('react-refresh/runtime', () => ({
  performReactRefresh: rs.fn(),
}));

afterEach(() => {
  rs.useRealTimers();
  rs.resetAllMocks();
});

it.each([true, false])(
  'preserves pending callbacks (first call has callback: %s)',
  (hasFirstCallback) => {
    rs.useFakeTimers();
    const calls: string[] = [];
    rs.mocked(performReactRefresh).mockImplementation(() => {
      calls.push('refresh');
    });

    enqueueUpdate(hasFirstCallback ? () => calls.push('first') : undefined);
    rs.advanceTimersByTime(10);
    enqueueUpdate(() => calls.push('second'));
    expect(calls).toEqual([]);

    rs.advanceTimersByTime(20);
    const expected = hasFirstCallback
      ? ['refresh', 'first', 'second']
      : ['refresh', 'second'];
    expect(calls).toEqual(expected);

    enqueueUpdate();
    rs.advanceTimersByTime(30);
    expect(calls).toEqual([...expected, 'refresh']);
  },
);
