import tiktoken

class ConversationQueue:

    phrase_delimiters = [
        "。",
        "，",
        ".",
        "!",
        "?",
        ";",
        ")",
        "،",
        "۔",
        "।",
        "॥",
        "|",
        "||",
        ",",
        ":",
    ]

    token_base = {
        "id": "chatcmpl-9Su6h3Ay7vEnHuwQGxZjFrGiU6AxN",
        "choices": [
            {
                "delta": {
                    "content": None,
                    "function_call": None,
                    "role": None,
                    "tool_calls": None,
                },
                "finish_reason": None,
                "index": 0,
                "logprobs": None,
            }
        ],
        "created": 1716675887,
        "model": "gpt-3.5-turbo-0125",
        "object": "chat.completion.chunk",
        "system_fingerprint": None,
    }

    stop_base = {
        "id": "chatcmpl-9Su6h3Ay7vEnHuwQGxZjFrGiU6AxN",
        "choices": [
            {
                "delta": {
                    "content": None,
                    "function_call": None,
                    "role": None,
                    "tool_calls": None,
                },
                "finish_reason": "stop",
                "index": 0,
                "logprobs": None,
            }
        ],
        "created": 1716675887,
        "model": "gpt-3.5-turbo-0125",
        "object": "chat.completion.chunk",
        "system_fingerprint": None,
    }

    def __init__(self, model: str, add_stop=False):
        self.queue = []
        self.initialized = False
        self.phrase_count = 0
        self.add_stop_flag = add_stop
        self.has_ended_speaking_bool = False
        try:
            self.encoding = tiktoken.encoding_for_model(model) or tiktoken.encoding_for_model('gpt-3.5-turbo')
        except:
            self.encoding = tiktoken.encoding_for_model('gpt-3.5-turbo')

    def __len__(self):
        return len(self.queue)

    def queue(self):
        return self.queue

    def __str__(self):
        string_result = ""
        for token in self.queue:
            text_token = token["choices"][0]["delta"]["content"]
            string_result += text_token or ""
        return string_result

    def is_initialized(self):
        return self.initialized
    
    def add_phrase(self, phrase):
        token_encoding = self.encoding.encode(phrase)
        binary_encoding = [self.encoding.decode_single_token_bytes(token) for token in token_encoding]
        for bin_token in binary_encoding:
            self.add_tok_unformatted(
                str(bin_token, 'utf-8')
            )

    def add_tok(self, tok):
        self.initialized = True
        if tok.choices[0].finish_reason == "stop":
            if self.add_stop:
                self.add_stop()
        else:
            text_token = tok.choices[0].delta.content
            self.add_tok_unformatted(text_token)

    def add_tok_unformatted(self, tok: str):
        if tok is None:
            if self.add_stop_flag:
                self.add_stop()
            return
        token_base = {
            "id": "chatcmpl-9Su6h3Ay7vEnHuwQGxZjFrGiU6AxN",
            "choices": [
                {
                    "delta": {
                        "content": None,
                        "function_call": None,
                        "role": None,
                        "tool_calls": None,
                    },
                    "finish_reason": None,
                    "index": 0,
                    "logprobs": None,
                }
            ],
            "created": 1716675887,
            "model": "gpt-3.5-turbo-0125",
            "object": "chat.completion.chunk",
            "system_fingerprint": None,
        }
        self.initialized = True
        if tok.strip() in self.phrase_delimiters:
            self.phrase_count += 1
        token_base["choices"][0]["delta"]["content"] = tok
        self.queue.append(token_base)

    def add_stop(self):
        self.queue.append(self.stop_base)
        self.phrase_count += 1

    def next_tok(self):
        next_token = self.queue.pop(0)
        # test finish reason is stop
        if next_token["choices"][0]["finish_reason"] == "stop":
            self.has_ended_speaking_bool = True
        if (next_token["choices"][0]["delta"]["content"]) and next_token["choices"][0][
            "delta"
        ]["content"].strip() in self.phrase_delimiters:
            self.phrase_count -= 1
        return next_token

    def format_token(self, tok):
        token = self.token_base.copy()
        token["choices"][0]["delta"]["content"] = tok
        return token

    def next_phrase(self):
        phrase_queue = []
        while self.has_next():
            tok = self.next_tok()
            phrase_queue.append(tok)
            if (not tok["choices"][0]["delta"]["content"]) or tok["choices"][0][
                "delta"
            ]["content"].strip() in self.phrase_delimiters:
                self.phrase_count -= 1
                break
        return phrase_queue

    def has_next(self):
        return len(self.queue) > 0

    def has_next_phrase(self):
        return self.phrase_count > 0

    def has_ended_speaking(self):
        return self.has_ended_speaking_bool
