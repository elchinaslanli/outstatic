import { useRouter } from 'next/router'
import { useContext } from 'react'
import { RegisterOptions, useFormContext } from 'react-hook-form'
import { convert } from 'url-slug'
import { PostContext } from '../../context'
import DateTimePicker from '../DateTimePicker'
import DeletePostButton from '../DeletePostButton'
import Input from '../Input'
import TextArea from '../TextArea'

type PostSettingsProps = {
  saveFunc: () => void
  loading: boolean
  validation?: RegisterOptions
  showDelete: boolean
}

const PostSettings = ({
  saveFunc,
  loading,
  validation,
  showDelete
}: PostSettingsProps) => {
  const { register } = useFormContext()
  const router = useRouter()
  const { post, editPost, hasChanges, contentType } = useContext(PostContext)

  return (
    <aside className="relative flex w-full items-center justify-between border-b border-gray-300 bg-white p-4 md:w-64 md:flex-none md:flex-col md:flex-wrap md:items-start md:justify-start md:border-b-0 md:border-l md:py-6">
      <div className="relative hidden w-full items-center justify-between md:mb-4 md:flex">
        <DateTimePicker
          id="publishedAt"
          label="Date"
          date={post.publishedAt}
          setDate={publishedAt => editPost('publishedAt', publishedAt)}
        />
      </div>
      <div className="relative hidden w-full items-center justify-between md:mb-4 md:flex">
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-900"
        >
          Status
        </label>
        <select
          {...register('status', validation)}
          name="status"
          id="status"
          defaultValue={post.status}
          className="block cursor-pointer appearance-none rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div className="hidden w-full md:mb-4 md:block">
        <Input
          label="URL Slug"
          name="slug"
          id="slug"
          defaultValue={post.slug}
          inputSize="small"
          validation={{
            onChange: e => {
              editPost(
                'slug',
                convert(e.target.value, { dictionary: { "'": '' } })
              )
            }
          }}
        />
      </div>
      <div
        className={`flex w-full pb-4 ${
          showDelete ? 'justify-between' : 'justify-end'
        }`}
      >
        {showDelete && (
          <DeletePostButton
            disabled={loading}
            slug={post.slug}
            onComplete={() => {
              router.push(`/outstatic/${contentType}`)
            }}
            contentType={contentType}
          />
        )}

        <button
          onClick={saveFunc}
          type="button"
          disabled={loading || !hasChanges}
          className="flex rounded-lg border border-gray-600 bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:border-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-700 disabled:cursor-not-allowed disabled:bg-gray-600 md:mb-2"
        >
          {loading ? (
            <>
              <svg
                className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Saving
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
      <div className="border-t-2 py-4 hidden w-full md:mb-4 md:block">
        <TextArea
          name="description"
          type="textarea"
          label="Description"
          id="description"
          // defaultValue={post.description}
          rows={5}
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
    </aside>
  )
}

export default PostSettings