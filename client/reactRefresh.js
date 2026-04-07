import {
  createSignatureFunctionForTransform,
  register,
} from 'react-refresh/runtime';
import { executeRuntime, getModuleExports } from './refreshUtils.js';

function refresh(moduleId, webpackHot) {
  const currentExports = getModuleExports(moduleId);
  const fn = (exports) => {
    var testMode;
    if (typeof __react_refresh_test__ !== 'undefined') {
      testMode = __react_refresh_test__;
    }
    executeRuntime(exports, moduleId, webpackHot, testMode);
  };
  if (typeof Promise !== 'undefined' && currentExports instanceof Promise) {
    currentExports.then(fn);
  } else {
    fn(currentExports);
  }
}

export { createSignatureFunctionForTransform, refresh, register };
