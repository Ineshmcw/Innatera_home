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

const urls = {
  home: 'https://innatera.com',
  twitter: 'https://twitter.com/innatera',
  facebook: 'https://www.facebook.com/platformio',
  linkedin: 'https://www.linkedin.com/company/innatera',
  github: 'https://github.com/innatera',
  community: 'https://forum.innatera.com/help',
};

const messages = {
  homeQuickButtonProjectExamples: 'Project Examples',
};

export default {
  name: 'innatera',
  title: 'Innatera',
  companyLogoSrc: require('./innatera_logo.png').default,
  showPIOVersions: true,
  footerQuickLinks: [
    { title: 'Web', url: urls.home },
    { title: 'Open Source', url: urls.github },
   // { title: 'Get Started', url: 'http://docs.platformio.org/page/ide/pioide.html' },
   // { title: 'Docs', url: 'http://docs.platformio.org' },
    { title: 'News', url: urls.twitter },
    { title: 'Community', url: urls.community },
    { title: 'Contact Us', url: 'https://innatera.com/contact' },
  ],
  urls,
  messages,
};
