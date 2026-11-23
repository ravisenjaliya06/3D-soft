# Python imports
import os
import shutil
import tempfile
from unittest.mock import patch

# App imports
from design.tasks import delete_output_folder
from tests.testing import APIBaseTestCase


class DeleteOutputFolderTestCase(APIBaseTestCase):
    def test_delete_output_folder_success(self: "DeleteOutputFolderTestCase") -> None:
        """Test successful deletion of a folder."""
        tmpdir = tempfile.mkdtemp()
        self.assertTrue(os.path.exists(tmpdir))

        with patch("design.tasks.Logger") as mock_logger:
            delete_output_folder(tmpdir)

        self.assertFalse(os.path.exists(tmpdir))
        mock_logger.info.assert_called_once()

    def test_delete_output_folder_not_exists(
        self: "DeleteOutputFolderTestCase",
    ) -> None:
        """Test when the folder does not exist."""
        tmp_parent = tempfile.gettempdir()
        fake_path = os.path.join(tmp_parent, "non_existent_folder_12345")
        if os.path.exists(fake_path):
            shutil.rmtree(fake_path)

        with patch("design.tasks.Logger") as mock_logger:
            delete_output_folder(fake_path)

        mock_logger.warning.assert_called_once()

    def test_delete_output_folder_is_file(self: "DeleteOutputFolderTestCase") -> None:
        """Test when the path exists but is a file, not a directory."""
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            file_path = tmp.name

        try:
            self.assertTrue(os.path.exists(file_path))
            with patch("design.tasks.Logger") as mock_logger:
                delete_output_folder(file_path)

            self.assertTrue(os.path.exists(file_path))
            mock_logger.warning.assert_called_once()
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)
