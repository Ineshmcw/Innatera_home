/**
 * Copyright (c) 2014-present PlatformIO <contact@platformio.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as pathlib from '@core/path';

import { CONFIG_KEY, METRICS_KEY, RESULT_KEY, STORAGE_KEY } from '@inspect/constants';
import { INSPECT_PROJECT, REINSPECT_PROJECT, inspectProject } from '@inspect/actions';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { deleteEntity, updateEntity, updateStorageItem } from '@store/actions';
import {
  selectInspectStorage,
  selectInspectionResult,
  selectIsConfigurationDifferent,
  selectSavedConfiguration,
} from '@inspect/selectors';

import { backendFetchData } from '@store/backend';
import { goTo } from '@core/helpers';
import jsonrpc from 'jsonrpc-lite';
import { selectProjectInfo } from '@project/selectors';

function* _updateMetric(name, projectDir, env, duration) {
  const storage = yield select(selectInspectStorage);
  if (!storage[METRICS_KEY]) {
    storage[METRICS_KEY] = {};
  }
  const metricKey = [projectDir, env, name].join(':');
  storage[METRICS_KEY][metricKey] = duration;
  yield put(updateStorageItem(STORAGE_KEY, storage));
}

function* _inspectMemory({ projectDir, env }) {
  const start = Date.now();
  yield call(backendFetchData, {
    query: 'core.call',
    params: [
      ['run', '-d', projectDir, '-e', env, '-t', 'sizedata'],
      { force_subprocess: true },
    ],
  });

  const buildDir = yield call(backendFetchData, {
    query: 'project.config_call',
    params: [
      { path: pathlib.join(projectDir, 'conf.ini') },
      'get_optional_dir',
      'build',
    ],
  });
  const sizedataPath = pathlib.join(buildDir, env, 'sizedata.json');

  const jsonContent = yield call(backendFetchData, {
    query: 'os.request_content',
    params: [sizedataPath],
  });
  if (!jsonContent) {
    return;
  }
  const result = JSON.parse(jsonContent);
  yield _updateMetric('memory', projectDir, env, Date.now() - start);

  return result;
}

function* _inspectCode({ projectDir, env }) {
  const start = Date.now();
  let lastError = undefined;
  try {
    const codeCheckResults = yield call(backendFetchData, {
      query: 'core.call',
      params: [
        ['check', '-d', projectDir, '-e', env, '--json-output'],
        { force_subprocess: true },
      ],
    });
    yield _updateMetric('code', projectDir, env, Date.now() - start);
    return codeCheckResults;
  } catch (err) {
    lastError = err;
    console.warn('Problem has occured when inspecting a code', err);
  }
  // examine tool output in verbose mode
  try {
    const output = yield call(backendFetchData, {
      query: 'core.call',
      params: [
        ['check', '-d', projectDir, '-e', env, '--verbose'],
        { force_subprocess: true },
      ],
    });
    throw new Error(output);
  } catch (err) {
    if (err.data) {
      throw new Error(err.data.replace('\\n', '\n'));
    }
  }
  throw lastError;
}

function* watchInspectProject() {
  yield takeLatest(INSPECT_PROJECT, function* ({ configuration, onEnd }) {
    try {
      if (!(yield select(selectProjectInfo, configuration.projectDir))) {
        throw new Error(
          `Can't inspect non-existing project '${configuration.projectDir}'`
        );
      }

      if (!(yield select(selectIsConfigurationDifferent, configuration))) {
        const currentResult = yield select(selectInspectionResult);
        if (currentResult && !currentResult.error) {
          // Result is already present
          if (onEnd) {
            onEnd(currentResult);
          }
          return;
        }
      }
      yield put(deleteEntity(new RegExp(`^${RESULT_KEY}$`)));
      const storage = yield select(selectInspectStorage);
      storage[CONFIG_KEY] = configuration;
      yield put(updateStorageItem(STORAGE_KEY, storage));

      const state = yield select();
      if (state.router) {
        yield call(goTo, state.router.history, '/inspect/processing', undefined, true);
      }

      const { memory, code } = configuration;

      let memoryResult;
      let codeCheckResult;

      if (memory) {
        memoryResult = yield call(_inspectMemory, configuration);
        if (!memoryResult) {
          throw new Error('Memory inspect returned no result');
        }
        yield put(updateEntity(RESULT_KEY, { memory: memoryResult }));
      }

      if (code) {
        codeCheckResult = yield call(_inspectCode, configuration);
      }
      yield put(
        updateEntity(RESULT_KEY, { memory: memoryResult, codeChecks: codeCheckResult })
      );
      const entity = { memory: memoryResult, codeChecks: codeCheckResult };
      if (onEnd) {
        onEnd(entity);
      }
      if (state.router) {
        yield call(goTo, state.router.history, '/inspect/result', undefined, true);
      }
    } catch (e) {
      console.error('Exception during inspectProject', e);
      let error = 'Exception';
      if (e instanceof jsonrpc.JsonRpcError) {
        error = e.message;
        if (e.data) {
          error += ': ' + JSON.stringify(e.data);
        }
      } else if (e instanceof SyntaxError) {
        error = 'Bad JSON';
      } else {
        error = e.toString();
      }
      if (onEnd) {
        onEnd(undefined, error);
      }
      yield put(updateEntity(RESULT_KEY, { error }));
      const state = yield select();
      if (state.router) {
        yield call(goTo, state.router.history, '/inspect', undefined, true);
      }
    }
  });
}

function* watchReinspectProject() {
  yield takeLatest(REINSPECT_PROJECT, function* ({ onEnd }) {
    const configuration = yield select(selectSavedConfiguration);
    if (!configuration) {
      throw new Error('No inspection configuration ro run reinspectProject');
    }
    yield put(deleteEntity(new RegExp(`^${RESULT_KEY}$`)));
    yield put(inspectProject(configuration, onEnd));
  });
}

export default [watchInspectProject, watchReinspectProject];
