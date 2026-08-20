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
import { APP_ROUTES } from "./routePaths";

function App() {
  return (
    <Routes>
      <Route path={APP_ROUTES.login} element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RecipeBookLayout />}>
          <Route path={APP_ROUTES.recipes} element={<RecipeBookIndexPage />} />
          <Route path={APP_ROUTES.recipeNew} element={<RecipeNewPage />} />
          <Route path={APP_ROUTES.recipeDetail} element={<RecipeDetailPage />} />
          <Route
            path={APP_ROUTES.transferInvitations}
            element={<TransferInvitationDialogPage />}
          />
        </Route>
        <Route
          path={APP_ROUTES.recipeDraft}
          element={
            <RecipeDraftRoute>
              <RecipeDraftPage />
            </RecipeDraftRoute>
          }
        />
        <Route path={APP_ROUTES.recipeEdit} element={<RecipeEditPage />} />
        <Route
          path={APP_ROUTES.transferInvitation}
          element={<TransferInvitationPage />}
        />
      </Route>
    </Routes>
  )
}

export default App;
