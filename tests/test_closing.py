import threading
import types
import unittest
from unittest.mock import patch, Mock
from main import Api, main

class ClosingTests(unittest.TestCase):
    def test_close_does_not_wait_for_file_operation(self):
        api = Api()
        api._lock.acquire()
        result = []
        worker = threading.Thread(target=lambda: result.append(api.can_close()), daemon=True)
        worker.start(); worker.join(timeout=0.5)
        try:
            self.assertFalse(worker.is_alive(), 'Close handler blocked on file operation')
            self.assertEqual(result, [False])
        finally:
            api._lock.release()
        self.assertTrue(api.can_close())
        self.assertTrue(api.can_close())

    def test_window_close_never_calls_javascript_or_dialog(self):
        class Event:
            def __iadd__(self, fn): self.handler = fn; return self
        event = Event()
        window = types.SimpleNamespace(events=types.SimpleNamespace(closing=event),
            evaluate_js=Mock(side_effect=AssertionError('UI callback during close')),
            create_confirmation_dialog=Mock(side_effect=AssertionError('Nested dialog')))
        module = types.SimpleNamespace(create_window=Mock(return_value=window),start=Mock())
        with patch.dict('sys.modules', {'webview': module}):
            main()
        self.assertTrue(module.create_window.call_args.kwargs['confirm_close'])
        self.assertTrue(event.handler())
        window.evaluate_js.assert_not_called()
        window.create_confirmation_dialog.assert_not_called()
