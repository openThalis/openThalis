# openThalis

### A metamorphic application powered by Artificial Intelligence. 

### [Check out the video introduction and demos at openthalis.ai](https://openthalis.ai)

### ⚠️ This project is in beta, released to be familiarized and experimented with so please report any issues you find; check the [notice me file](./NOTICEME.md) for more information.

---

### Features:
- Create and manage unlimited AI agents with various modes (tools, delegation, awareness, local file access, etc.)
- Chat with AI agents, that can use perform actions by using tools and collaborate with other agents
- Summon specific agents during a chat session
- Allow self-awareness of the source code of openThalis to the AIs for special cases
- Give access to a folder of files to the agents to use as context for the session and their actions
- Manage tasks and schedule them at any interval to be done automatically by specific agents
- Integrated files manager
- Autocreate programs based on your needs
- Many features present to explore and more to come...

### User friendly:
You can jump right in and start using openThalis once you install it. I aim to make the user experience as smooth as possible, you do not need to know anything about programming or AI to use it, so if you have any feedback, please let me know.

### Developer friendly:
openThalis is built with in mind to be a plug and play application, so you can use it as is or customize it to your needs. You can add your own AI providers, tools, and more easily; just activate the selfawareness mode and ask any of the AIs how to do it (you can even set the local path to its own source code and make openThalis make the changes).

---

## Setup

0. Clone the repository and ensure you have [git](https://git-scm.com/downloads) (or manually download), [python](https://www.python.org/downloads/) and [rust](https://www.rust-lang.org/tools/install) ¬ additionally if you want to use local models you need to install [ollama](https://ollama.ai/download) and download the [models](https://ollama.ai/models)
1. Get inside the folder repository and rename template.env to .env and place 2 exact copies, one in engine and one in interface:
```bash
cp template.env engine/.env
cp template.env interface/.env
```
2. Install the python requirements:
```bash
pip install -r REQUIREMENTS.txt
```
3. Open a new terminal, get inside the folder repository and start the engine:
```bash
cd engine
python start_engine.py
```
4. Open a new terminal, get inside the folder repository and start the interface:
```bash
cd interface
cargo run
```
5. Wait for the application to be built and launched then you can create a [new instance](https://openthalis.ai/demos#instance) and enjoy!

P.S Next time you want to start the application you can just do step 3 & 4

## Docs
You can find the documentation at [docs](https://openthalis.ai/docs)

## Follow us on X

- [x.com/NootkaNika](https://x.com/NootkaNika)
- [x.com/openThalis](https://x.com/openthalis)

## Contact
- [openThalis/connect](https://openthalis.ai/connect)

## License

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). For more information, please see the [AGPL-3.0 license text](./LICENCE) or visit [https://www.gnu.org/licenses/agpl-3.0](https://www.gnu.org/licenses/agpl-3.0).