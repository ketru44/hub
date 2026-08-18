function RecipeBookIndexPage() {
  return (
    <div className="flex h-full items-center justify-center p-10 text-center">
      <div className="max-w-xs">
        <h2 className="text-2xl font-semibold tracking-[0.04em] text-[#34362f]">
          어떤 레시피를 펼쳐볼까요?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#626157]">
          왼쪽 목록에서 레시피를 선택하면 이 페이지에서 내용을 확인할 수
          있습니다.
        </p>
      </div>
    </div>
  );
}

export default RecipeBookIndexPage;
