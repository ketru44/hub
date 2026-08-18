import { Route, Routes } from "react-router";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import RecipeDraftPage from "./pages/RecipeDraftPage";
import RecipeDraftRoute from "./components/RecipeDraftRoute";
import TransferInvitationPage from "./pages/TransferInvitationPage";
import RecipeEditPage from "./pages/RecipeEditPage";
import RecipeBookLayout from "./layouts/RecipeBookLayout";
import RecipeBookIndexPage from "./pages/RecipeBookIndexPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import RecipeNewPage from "./pages/RecipeNewPage";
import TransferInvitationDialogPage from "./pages/TransferInvitationDialogPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RecipeBookLayout />}>
          <Route path="/recipes" element={<RecipeBookIndexPage />} />
          <Route path="/recipes/new" element={<RecipeNewPage />} />
          <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
          <Route
            path="/transfer-invitations"
            element={<TransferInvitationDialogPage />}
          />
        </Route>
        <Route
          path="/recipes/draft"
          element={
            <RecipeDraftRoute>
              <RecipeDraftPage />
            </RecipeDraftRoute>
          }
        />
        <Route path="/recipes/:recipeId/edit" element={<RecipeEditPage />} />
        <Route
          path="/transfer-invitations/:linkToken"
          element={<TransferInvitationPage />}
        />
      </Route>
    </Routes>
  )
}

export default App;
